import { readFileSync } from 'node:fs';
import { erc20Abi, formatUnits } from 'viem';
import { explorerTxUrl, fujiTransport, publicClient } from '../config/chain.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { toHttpError } from './contractErrors.js';
import { writeAsMaster } from './masterWallet.js';
import { getSmartAccountAddress } from './smartAccount.js';
import { sendBatch } from './wallet.js';

/**
 * Contrato EscrowPanales desplegado en Fuji (CONTRATO_AVALANCH).
 *
 * - Las Abejas operan desde su smart account (ZeroDev Kernel) con UserOps patrocinadas por el paymaster.
 *   Todo lo que cobra USDC va en una sola UserOp: approve(USDC -> escrow) + la llamada.
 * - Las transiciones de etapa (cotizacion, recoleccion, liberar, sellar, cancelar) son onlyOwner:
 *   las firma la wallet master.
 *
 * Maquina de estados (verificada contra el contrato desplegado):
 *   0 Reservando   crearPanal / unirseAlPanal (adelanto) / salirDelPanal (devuelve lo pagado)
 *   1 Cotizando    iniciarCotizacion (exige el minimo reservado); nadie mas entra
 *   2 Recolectando abrirRecoleccion(precioFinal, fin): pagarSaldo, unirseAlPanalConPagoCompleto
 *   3 Liberado     liberarFondos tras vencer el plazo y con el minimo pagado: USDC -> tesoreria
 *   4 Sellado      sellarPanal; quien no pago recupera su adelanto con reembolsar
 *   5 Cancelado    cancelarPanal; todos recuperan lo pagado con reembolsar
 */
export const escrowAbi = JSON.parse(
  readFileSync(new URL('../../ABIS/EscrowPanales.abi.json', import.meta.url), 'utf8'),
);

export const ESTADO = Object.freeze({
  RESERVANDO: 0,
  COTIZANDO: 1,
  RECOLECTANDO: 2,
  LIBERADO: 3,
  SELLADO: 4,
  CANCELADO: 5,
});

const toUsdc = (raw) => Number(formatUnits(raw, env.USDC_TOKEN_DECIMALS));

function assertConfigured() {
  if (!env.CONTRATO_AVALANCH || !env.USDC_TOKEN_ADDRESS) {
    throw new HttpError(503, 'El contrato de Panales no esta configurado en el servidor', {
      code: 'escrow_not_configured',
      details: 'Faltan CONTRATO_AVALANCH / USDC_TOKEN_ADDRESS en el .env',
    });
  }
}

const read = (functionName, args = []) =>
  publicClient.readContract({ address: env.CONTRATO_AVALANCH, abi: escrowAbi, functionName, args });

/* ── Lecturas ─────────────────────────────────────────────────────────── */

let porcentajeAdelanto;

/** PORCENTAJE_ADELANTO / BASE_PORCENTAJES del contrato ({ numerador, base }). Constantes: se cachean. */
export async function obtenerPorcentajeAdelanto() {
  assertConfigured();
  if (!porcentajeAdelanto) {
    const [numerador, base] = await Promise.all([read('PORCENTAJE_ADELANTO'), read('BASE_PORCENTAJES')]);
    porcentajeAdelanto = { numerador, base };
  }
  return porcentajeAdelanto;
}

/** Adelanto en unidades minimas de USDC: precio * unidades * PORCENTAJE_ADELANTO / BASE_PORCENTAJES. */
export async function estimarAdelanto(precioUnidadRaw, unidades) {
  const { numerador, base } = await obtenerPorcentajeAdelanto();
  return (BigInt(precioUnidadRaw) * BigInt(unidades) * numerador) / base;
}

/**
 * Struct `panales(panalId)` con los montos en raw (bigint). null si no existe.
 * El contrato actual no guarda un objetivo de celdas: el tope del Panal vive en Firestore (`targetUnits`).
 */
export async function leerPanalRaw(panalId) {
  assertConfigured();
  const [
    precioEstimadoUnidad,
    precioFinalUnidad,
    minimoUnidades,
    unidadesReservadas,
    unidadesPagadasCompletas,
    fondosPagadosCompletos,
    finReservas,
    finRecoleccion,
    estado,
    existe,
  ] = await read('panales', [panalId]);
  if (!existe) return null;
  return {
    precioEstimadoUnidad,
    precioFinalUnidad,
    minimoUnidades,
    unidadesReservadas,
    unidadesPagadasCompletas,
    fondosPagadosCompletos,
    finReservas: Number(finReservas),
    finRecoleccion: Number(finRecoleccion),
    estado: Number(estado),
  };
}

/** Version serializable (JSON) de `leerPanalRaw`. */
export async function leerPanal(panalId) {
  if (!env.CONTRATO_AVALANCH) return null;
  const p = await leerPanalRaw(panalId);
  if (!p) return null;
  return {
    ...p,
    precioEstimadoUnidad: p.precioEstimadoUnidad.toString(),
    precioFinalUnidad: p.precioFinalUnidad.toString(),
    minimoUnidades: p.minimoUnidades.toString(),
    unidadesReservadas: p.unidadesReservadas.toString(),
    unidadesPagadasCompletas: p.unidadesPagadasCompletas.toString(),
    fondosPagadosCompletos: p.fondosPagadosCompletos.toString(),
  };
}

/** `abejasPorPanal(panalId, wallet)`: celdas, USDC pagado (raw) y si ya pago el total. */
export async function leerAbeja(panalId, wallet) {
  const [unidades, montoPagado, pagoCompleto] = await read('abejasPorPanal', [panalId, wallet]);
  return { unidades, montoPagado, pagoCompleto };
}

/* ── Operaciones de la Abeja (UserOps patrocinadas) ───────────────────── */

async function saldoUsdc(address) {
  return publicClient.readContract({
    address: env.USDC_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
}

/**
 * Envia una UserOp desde la smart account del usuario.
 * `cobro` es el USDC que se aprueba al escrow; `credito` lo que el mismo batch devuelve antes de cobrar
 * (p. ej. salirDelPanal al aumentar la participacion), para validar el saldo antes de gastar gas.
 */
async function enviarUserOp(uid, calls, { cobro = 0n, credito = 0n, accion }) {
  assertConfigured();
  const wallet = await getSmartAccountAddress(uid);
  if (cobro > 0n) {
    const saldo = await saldoUsdc(wallet);
    if (saldo + credito < cobro) {
      const fmt = (v) => formatUnits(v, env.USDC_TOKEN_DECIMALS);
      throw new HttpError(
        400,
        `Saldo insuficiente: necesitas ${fmt(cobro - credito)} USDC y tu reserva tiene ${fmt(saldo)} USDC`,
        { code: 'saldo_insuficiente' },
      );
    }
  }

  const escrowCalls = calls.map((c) => ({ to: env.CONTRATO_AVALANCH, abi: escrowAbi, ...c }));
  // salirDelPanal va antes del approve: el reembolso tiene que llegar antes de volver a cobrar.
  const previas = escrowCalls.filter((c) => c.functionName === 'salirDelPanal');
  const resto = escrowCalls.filter((c) => c.functionName !== 'salirDelPanal');
  const approve =
    cobro > 0n
      ? [{ to: env.USDC_TOKEN_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [env.CONTRATO_AVALANCH, cobro] }]
      : [];

  let result;
  try {
    result = await sendBatch(uid, { calls: [...previas, ...approve, ...resto] });
  } catch (err) {
    throw toHttpError(err, escrowAbi);
  }
  if (result.status !== 'success') {
    throw new HttpError(502, `La operacion ${accion} revirtio en el contrato`, {
      code: 'tx_reverted',
      details: result.transactionHash,
    });
  }
  return {
    wallet,
    monto: toUsdc(cobro - credito > 0n ? cobro - credito : 0n),
    montoRaw: (cobro - credito > 0n ? cobro - credito : 0n).toString(),
    userOpHash: result.userOpHash,
    transactionHash: result.transactionHash,
    explorerUrl: result.explorerUrl,
  };
}

/**
 * El usuario funda el Panal y reserva sus celdas en la misma UserOp:
 * crearPanal(panalId, precioEstimadoUnidad, minimoUnidades, finReservas, unidadesCreador).
 * El contrato cobra al creador el adelanto (40%) de `unidadesCreador`.
 */
export async function crearPanal(uid, { panalId, precioEstimadoUnidad, minimoUnidades, finReservas, unidadesCreador }) {
  assertConfigured();
  const adelanto = await estimarAdelanto(precioEstimadoUnidad, unidadesCreador);
  return enviarUserOp(
    uid,
    [
      {
        functionName: 'crearPanal',
        args: [
          panalId,
          BigInt(precioEstimadoUnidad),
          BigInt(minimoUnidades),
          BigInt(finReservas),
          BigInt(unidadesCreador),
        ],
      },
    ],
    { cobro: adelanto, accion: 'crearPanal' },
  );
}

/** El contrato ya no limita las reservas: el tope es `targetUnits` del Panal en Firestore. */
function validarTope(panal, objetivoUnidades, unidades) {
  if (!objetivoUnidades) return;
  const libres = BigInt(objetivoUnidades) - panal.unidadesReservadas;
  if (BigInt(unidades) > libres) {
    const quedan = libres > 0n ? libres : 0n;
    throw new HttpError(400, `Solo quedan ${quedan} celdas libres en este Panal`, { code: 'panal_lleno' });
  }
}

/**
 * Nueva Abeja en el Panal. En Reservando paga el adelanto (unirseAlPanal); en Recolectando ya hay
 * precio final y entra pagando el total (unirseAlPanalConPagoCompleto).
 */
export async function unirseAlPanal(uid, { panalId, unidades, objetivoUnidades }) {
  const panal = await leerPanalRaw(panalId);
  if (!panal) throw new HttpError(404, 'El Panal no existe en el contrato', { code: 'not_found' });
  const u = BigInt(unidades);
  validarTope(panal, objetivoUnidades, u);

  if (panal.estado === ESTADO.RESERVANDO) {
    const cobro = await read('calcularAdelanto', [panalId, u]);
    const r = await enviarUserOp(uid, [{ functionName: 'unirseAlPanal', args: [panalId, u] }], { cobro, accion: 'unirseAlPanal' });
    return { ...r, tipo: 'adelanto' };
  }
  if (panal.estado === ESTADO.RECOLECTANDO) {
    const cobro = panal.precioFinalUnidad * u;
    const r = await enviarUserOp(uid, [{ functionName: 'unirseAlPanalConPagoCompleto', args: [panalId, u] }], {
      cobro,
      accion: 'unirseAlPanalConPagoCompleto',
    });
    return { ...r, tipo: 'pago_completo' };
  }
  throw new HttpError(400, 'Este Panal ya no acepta nuevas Abejas en su etapa actual', { code: 'etapa_invalida' });
}

/**
 * Aumenta las celdas de una Abeja que ya participa. El contrato no deja reservar dos veces
 * (AbejaYaParticipa), asi que en una sola UserOp atomica: salirDelPanal (devuelve lo pagado)
 * + approve + volver a entrar con el total de celdas.
 *   Reservando:   paga el adelanto del nuevo total.
 *   Recolectando: paga el total al precio final (queda con el pago completo).
 */
export async function aumentarParticipacion(uid, { panalId, unidadesExtra, objetivoUnidades }) {
  const panal = await leerPanalRaw(panalId);
  if (!panal) throw new HttpError(404, 'El Panal no existe en el contrato', { code: 'not_found' });
  const wallet = await getSmartAccountAddress(uid);
  const abeja = await leerAbeja(panalId, wallet);
  if (abeja.unidades === 0n) throw new HttpError(400, 'No participas en este Panal', { code: 'no_participa' });

  const total = abeja.unidades + BigInt(unidadesExtra);
  validarTope(panal, objetivoUnidades, unidadesExtra);

  if (panal.estado === ESTADO.RESERVANDO) {
    const cobro = await estimarAdelanto(panal.precioEstimadoUnidad, total);
    const r = await enviarUserOp(
      uid,
      [{ functionName: 'salirDelPanal', args: [panalId] }, { functionName: 'unirseAlPanal', args: [panalId, total] }],
      { cobro, credito: abeja.montoPagado, accion: 'aumentarParticipacion' },
    );
    return { ...r, tipo: 'aumento', unidades: Number(total) };
  }
  if (panal.estado === ESTADO.RECOLECTANDO) {
    const cobro = panal.precioFinalUnidad * total;
    const r = await enviarUserOp(
      uid,
      [
        { functionName: 'salirDelPanal', args: [panalId] },
        { functionName: 'unirseAlPanalConPagoCompleto', args: [panalId, total] },
      ],
      { cobro, credito: abeja.montoPagado, accion: 'aumentarParticipacion' },
    );
    return { ...r, tipo: 'aumento', unidades: Number(total) };
  }
  throw new HttpError(400, 'Solo puedes aumentar tu participacion mientras el Panal reserva o cobra', {
    code: 'etapa_invalida',
  });
}

/** Paga el restante: precioFinal * celdas - lo ya pagado. */
export async function pagarSaldo(uid, { panalId }) {
  const panal = await leerPanalRaw(panalId);
  if (!panal) throw new HttpError(404, 'El Panal no existe en el contrato', { code: 'not_found' });
  if (panal.estado !== ESTADO.RECOLECTANDO) {
    throw new HttpError(400, 'El Panal no esta cobrando el restante', { code: 'etapa_invalida' });
  }
  const wallet = await getSmartAccountAddress(uid);
  const abeja = await leerAbeja(panalId, wallet);
  if (abeja.unidades === 0n) throw new HttpError(400, 'No participas en este Panal', { code: 'no_participa' });
  if (abeja.pagoCompleto) throw new HttpError(400, 'Ya pagaste el total de tus celdas', { code: 'pago_completo' });

  const saldo = panal.precioFinalUnidad * abeja.unidades - abeja.montoPagado;
  const r = await enviarUserOp(uid, [{ functionName: 'pagarSaldo', args: [panalId] }], { cobro: saldo, accion: 'pagarSaldo' });
  return { ...r, tipo: 'saldo' };
}

/** Recupera lo pagado: Panal cancelado, o sellado sin haber pagado el restante. */
export async function reembolsar(uid, { panalId }) {
  const wallet = await getSmartAccountAddress(uid);
  const abeja = await leerAbeja(panalId, wallet);
  const r = await enviarUserOp(uid, [{ functionName: 'reembolsar', args: [panalId] }], { accion: 'reembolsar' });
  return { ...r, tipo: 'reembolso', monto: toUsdc(abeja.montoPagado), montoRaw: abeja.montoPagado.toString() };
}

/* ── Transiciones de etapa (wallet master) ────────────────────────────── */

const master = (functionName, args) => {
  assertConfigured();
  return writeAsMaster({
    client: publicClient,
    transport: fujiTransport,
    explorerTxUrl,
    address: env.CONTRATO_AVALANCH,
    abi: escrowAbi,
    functionName,
    args,
  });
};

export const iniciarCotizacion = (panalId) => master('iniciarCotizacion', [panalId]);
export const abrirRecoleccion = (panalId, precioFinalRaw, finRecoleccion) =>
  master('abrirRecoleccion', [panalId, BigInt(precioFinalRaw), BigInt(finRecoleccion)]);
export const extenderPlazo = (panalId, nuevoFin) => master('extenderPlazo', [panalId, BigInt(nuevoFin)]);
export const liberarFondos = (panalId) => master('liberarFondos', [panalId]);
export const sellarPanal = (panalId) => master('sellarPanal', [panalId]);
export const cancelarPanal = (panalId) => master('cancelarPanal', [panalId]);
export const transferirPropiedad = (nuevoOwner) => master('transferOwnership', [nuevoOwner]);

/* ── Estado global del contrato (consola del admin) ───────────────────── */

/**
 * owner, tesoreria, token de cobro, porcentaje de adelanto y saldos. Cada lectura es independiente:
 * si una falla (ABI desincronizado, RPC) vuelve null en vez de tumbar la pantalla completa.
 */
export async function leerContrato() {
  assertConfigured();
  const safe = (p) => p.catch(() => null);
  const masterAddress = env.WALLET_MASTER ?? null;
  const [owner, tesoreria, usdc, direccionUsdc, numerador, base, saldoEscrow, avaxMaster, block] = await Promise.all([
    safe(read('owner')),
    safe(read('tesoreria')),
    safe(read('usdc')),
    safe(read('DIRECCION_USDC')),
    safe(read('PORCENTAJE_ADELANTO')),
    safe(read('BASE_PORCENTAJES')),
    safe(saldoUsdc(env.CONTRATO_AVALANCH)),
    masterAddress ? safe(publicClient.getBalance({ address: masterAddress })) : null,
    safe(publicClient.getBlock()),
  ]);
  const saldoTesoreria = tesoreria ? await safe(saldoUsdc(tesoreria)) : null;
  return {
    address: env.CONTRATO_AVALANCH,
    chainId: publicClient.chain.id,
    owner,
    tesoreria,
    usdc: usdc ?? direccionUsdc,
    masterAddress,
    masterEsOwner: Boolean(owner && masterAddress && owner.toLowerCase() === masterAddress.toLowerCase()),
    advancePercent: numerador != null && base ? (Number(numerador) * 100) / Number(base) : null,
    saldoEscrowUsdc: saldoEscrow == null ? null : toUsdc(saldoEscrow),
    saldoTesoreriaUsdc: saldoTesoreria == null ? null : toUsdc(saldoTesoreria),
    avaxMaster: avaxMaster == null ? null : Number(formatUnits(avaxMaster, 18)),
    blockTimestamp: block ? Number(block.timestamp) : null,
  };
}
