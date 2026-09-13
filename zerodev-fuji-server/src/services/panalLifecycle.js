import { formatUnits, parseUnits } from 'viem';
import { publicClient } from '../config/chain.js';
import { db, FieldValue } from '../config/firebase.js';
import { env } from '../config/env.js';
import { hskChain } from '../config/hsk.js';
import { HttpError } from '../middleware/errors.js';
import {
  ESTADO,
  abrirRecoleccion,
  cancelarPanal,
  extenderPlazo,
  iniciarCotizacion,
  leerAbeja,
  leerPanalRaw,
  liberarFondos,
  sellarPanal,
} from './escrowPanales.js';
import { crearExaKeys } from './exaKeys.js';
import { getMasterAccount } from './masterWallet.js';

/**
 * Ciclo de vida de un Panal. La cadena (EscrowPanales) es la fuente de verdad de etapas y pagos;
 * Firestore guarda el detalle de negocio y la propiedad de cada ExaKey.
 *
 * Colecciones:
 *   panales/{panalId}                      Panal: etapa, miembros, cotizacion vigente, txs, tokenId
 *   panales/{panalId}/cotizaciones/{id}    historial de cotizaciones (estimadas y aplicadas)
 *   pagos/{id}                             cada movimiento de USDC (adelanto, saldo, aumento, reembolso)
 *   exakeys/{tokenId}-{serial}             un recibo NFT por unidad de producto, con su dueno
 *   counters/exakeys                       siguiente tokenId de ExaKey1155
 */

export const ETAPAS = Object.freeze({
  [ESTADO.RESERVANDO]: 'reservando',
  [ESTADO.COTIZANDO]: 'negociando',
  [ESTADO.RECOLECTANDO]: 'cobrando',
  [ESTADO.LIBERADO]: 'liberado',
  [ESTADO.SELLADO]: 'sellado',
  [ESTADO.CANCELADO]: 'cancelado',
});

const decimals = () => env.USDC_TOKEN_DECIMALS;
const toUsdc = (raw) => Number(formatUnits(BigInt(raw), decimals()));
const toRaw = (value) => parseUnits(Number(value).toFixed(decimals()), decimals());
const ceilDiv = (a, b) => (a + b - 1n) / b;
const nowUnix = () => Math.floor(Date.now() / 1000);
// Hora de la cadena: es la que compara el contrato con finRecoleccion.
const chainNow = async () => Number((await publicClient.getBlock()).timestamp);
const txRef = (tx) => ({ hash: tx.transactionHash, explorerUrl: tx.explorerUrl, at: new Date().toISOString() });

const panalRef = (panalId) => db.collection('panales').doc(panalId);

async function loadPanal(panalId) {
  const snap = await panalRef(panalId).get();
  if (!snap.exists) throw new HttpError(404, 'Panal no encontrado', { code: 'not_found' });
  return snap.data() ?? {};
}

async function onchainOrThrow(panalId) {
  const onchain = await leerPanalRaw(panalId);
  if (!onchain) throw new HttpError(404, 'El Panal no existe en el contrato', { code: 'not_found_onchain' });
  return onchain;
}

/* ── Sincronizacion Firestore <- cadena ───────────────────────────────── */

/**
 * Relee etapa, celdas y pagos desde el contrato y los escribe en `panales/{panalId}`.
 * Los miembros que ya no tienen celdas (salieron o se reembolsaron) salen de la lista.
 */
export async function sincronizarPanal(panalId) {
  const onchain = await leerPanalRaw(panalId);
  if (!onchain) return null;
  const data = await loadPanal(panalId);

  const fromChain = new Map();
  await Promise.all(
    (data.members ?? [])
      .filter((m) => m.wallet)
      .map(async (m) => {
        const a = await leerAbeja(panalId, m.wallet);
        fromChain.set(m.uid, {
          units: Number(a.unidades),
          paidTotal: toUsdc(a.montoPagado),
          paidRaw: a.montoPagado.toString(),
          paidComplete: a.pagoCompleto,
        });
      }),
  );

  await db.runTransaction(async (tx) => {
    const fresh = (await tx.get(panalRef(panalId))).data() ?? {};
    // Miembros agregados mientras leiamos la cadena se conservan tal cual.
    const members = (fresh.members ?? [])
      .map((m) => (fromChain.has(m.uid) ? { ...m, ...fromChain.get(m.uid) } : m))
      .filter((m) => !fromChain.has(m.uid) || m.units > 0);
    const update = {
      stage: ETAPAS[onchain.estado] ?? 'desconocida',
      onchainState: onchain.estado,
      currentUnits: Number(onchain.unidadesReservadas),
      paidUnits: Number(onchain.unidadesPagadasCompletas),
      members,
      memberIds: members.map((m) => m.uid),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (onchain.precioFinalUnidad > 0n) {
      update.finalUnitPrice = toUsdc(onchain.precioFinalUnidad);
      update.finalUnitPriceRaw = onchain.precioFinalUnidad.toString();
    }
    if (onchain.finRecoleccion > 0) {
      update.finRecoleccion = onchain.finRecoleccion;
      update.collectionEndsAt = new Date(onchain.finRecoleccion * 1000).toISOString();
    }
    tx.update(panalRef(panalId), update);
  });
  return onchain;
}

/** Agrega (o actualiza) a la Abeja en `members` tras una UserOp exitosa; luego se sincroniza. */
export async function registrarMiembro(panalId, { uid, name, payment }) {
  await db.runTransaction(async (tx) => {
    const fresh = (await tx.get(panalRef(panalId))).data() ?? {};
    const members = [...(fresh.members ?? [])];
    const i = members.findIndex((m) => m.uid === uid);
    const base = {
      uid,
      name,
      wallet: payment.wallet,
      lastTransactionHash: payment.transactionHash,
      lastExplorerUrl: payment.explorerUrl,
    };
    if (i >= 0) members[i] = { ...members[i], ...base };
    else members.push({ ...base, units: 0, paidTotal: 0, paidComplete: false, joinedAt: new Date().toISOString() });
    tx.update(panalRef(panalId), { members, memberIds: members.map((m) => m.uid) });
  });
}

/** Deja constancia de cada movimiento de USDC en la coleccion `pagos`. */
export async function registrarPago(panalId, { uid, tipo, unidades, payment }) {
  await db.collection('pagos').add({
    panalId,
    uid,
    wallet: payment.wallet,
    tipo,
    unidades: unidades ?? null,
    monto: payment.monto ?? 0,
    montoRaw: payment.montoRaw ?? '0',
    userOpHash: payment.userOpHash ?? null,
    transactionHash: payment.transactionHash,
    explorerUrl: payment.explorerUrl,
    contractAddress: env.CONTRATO_AVALANCH,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/* ── Negociacion ──────────────────────────────────────────────────────── */

/** Pasa el Panal a negociacion con el proveedor (iniciarCotizacion). `actor` = uid del admin o 'auto'. */
export async function iniciarNegociacion(panalId, actor) {
  const onchain = await onchainOrThrow(panalId);
  if (onchain.estado !== ESTADO.RESERVANDO) {
    throw new HttpError(400, 'El Panal ya salio de la etapa de reservas', { code: 'etapa_invalida' });
  }
  if (onchain.unidadesReservadas < onchain.minimoUnidades) {
    throw new HttpError(
      400,
      `Faltan ${onchain.minimoUnidades - onchain.unidadesReservadas} celdas para el minimo del Panal`,
      { code: 'minimo_no_alcanzado' },
    );
  }
  const tx = await iniciarCotizacion(panalId);
  await panalRef(panalId).update({
    'txs.negociacion': txRef(tx),
    negotiation: { startedAt: new Date().toISOString(), startedBy: actor },
  });
  await sincronizarPanal(panalId);
  return tx;
}

/** Si el Panal lleno su objetivo, arranca la negociacion solo. No lanza: es un efecto secundario. */
export async function negociarSiEstaLleno(panalId) {
  try {
    const onchain = await leerPanalRaw(panalId);
    if (onchain?.estado === ESTADO.RESERVANDO && onchain.unidadesReservadas >= onchain.objetivoUnidades) {
      await iniciarNegociacion(panalId, 'auto');
      console.log(`[panales] ${panalId} lleno: negociacion iniciada`);
    }
  } catch (err) {
    console.error(`[panales] no se pudo iniciar la negociacion de ${panalId}: ${err?.message}`);
  }
}

/**
 * Precio real por unidad a partir de lo negociado con el proveedor:
 *   costo total  = precio proveedor * unidades + envio + otros costos
 *   total final  = costo total * (1 + ganancia%)
 *   precio final = total final / unidades   (redondeado hacia arriba al centavo de USDC minimo)
 */
export function calcularCotizacion({ unidades, precioProveedorUnidad, envioTotal, otrosCostos = 0, gananciaPorcentaje }) {
  const u = BigInt(unidades);
  if (u <= 0n) throw new HttpError(400, 'El Panal no tiene celdas reservadas', { code: 'sin_unidades' });

  const productoRaw = toRaw(precioProveedorUnidad) * u;
  const envioRaw = toRaw(envioTotal);
  const otrosRaw = toRaw(otrosCostos);
  const costoRaw = productoRaw + envioRaw + otrosRaw;
  const bps = BigInt(Math.round(Number(gananciaPorcentaje) * 100));
  const precioFinalRaw = ceilDiv(ceilDiv(costoRaw * (10_000n + bps), 10_000n), u);
  const totalFinalRaw = precioFinalRaw * u;
  const costoUnidadRaw = ceilDiv(costoRaw, u);

  return {
    unidades: Number(u),
    precioProveedorUnidad: Number(precioProveedorUnidad),
    envioTotal: Number(envioTotal),
    otrosCostos: Number(otrosCostos),
    gananciaPorcentaje: Number(gananciaPorcentaje),
    productoTotal: toUsdc(productoRaw),
    costoTotal: toUsdc(costoRaw),
    envioPorUnidad: toUsdc(ceilDiv(envioRaw + otrosRaw, u)),
    costoPorUnidad: toUsdc(costoUnidadRaw),
    comisionPorUnidad: toUsdc(precioFinalRaw - costoUnidadRaw),
    comisionTotal: toUsdc(totalFinalRaw - costoRaw),
    precioFinalUnidad: toUsdc(precioFinalRaw),
    precioFinalUnidadRaw: precioFinalRaw.toString(),
    totalFinal: toUsdc(totalFinalRaw),
  };
}

/** Cotizacion con el desglose por Abeja (total, ya pagado, restante) y el precio minimo que acepta el contrato. */
async function cotizarPanal(panalId, input) {
  const onchain = await onchainOrThrow(panalId);
  const data = await loadPanal(panalId);
  const cotizacion = calcularCotizacion({ ...input, unidades: onchain.unidadesReservadas });
  const precioFinalRaw = BigInt(cotizacion.precioFinalUnidadRaw);

  let precioMinimoRaw = 0n;
  const abejas = await Promise.all(
    (data.members ?? [])
      .filter((m) => m.wallet)
      .map(async (m) => {
        const a = await leerAbeja(panalId, m.wallet);
        if (a.unidades > 0n) {
          const minimo = ceilDiv(a.montoPagado, a.unidades);
          if (minimo > precioMinimoRaw) precioMinimoRaw = minimo;
        }
        const total = precioFinalRaw * a.unidades;
        return {
          uid: m.uid,
          name: m.name ?? '',
          unidades: Number(a.unidades),
          pagado: toUsdc(a.montoPagado),
          total: toUsdc(total),
          restante: toUsdc(total > a.montoPagado ? total - a.montoPagado : 0n),
        };
      }),
  );

  return {
    ...cotizacion,
    precioEstimadoUnidad: toUsdc(onchain.precioEstimadoUnidad),
    precioMinimoPermitido: toUsdc(precioMinimoRaw),
    valida: precioFinalRaw >= precioMinimoRaw,
    abejas: abejas.filter((a) => a.unidades > 0),
    horasCobro: env.PANAL_COBRO_HORAS,
    etapa: ETAPAS[onchain.estado],
  };
}

async function guardarCotizacion(panalId, cotizacion, { estado, actor, tx }) {
  const { abejas, ...resumen } = cotizacion;
  await panalRef(panalId)
    .collection('cotizaciones')
    .add({
      ...resumen,
      abejas,
      estado,
      creadaPor: actor,
      transactionHash: tx?.transactionHash ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/** Solo calcula y guarda en el historial; no toca la cadena. */
export async function estimarCotizacion(panalId, input, actor) {
  const cotizacion = await cotizarPanal(panalId, input);
  await guardarCotizacion(panalId, cotizacion, { estado: 'estimada', actor });
  return cotizacion;
}

/**
 * Aplica la cotizacion: abrirRecoleccion(precioFinal, ahora + PANAL_COBRO_HORAS). Desde aqui las
 * Abejas tienen el plazo para pagar el restante y las comisiones.
 */
export async function abrirCobro(panalId, input, actor) {
  const onchain = await onchainOrThrow(panalId);
  if (onchain.estado !== ESTADO.COTIZANDO) {
    throw new HttpError(400, 'Primero hay que iniciar la negociacion del Panal', { code: 'etapa_invalida' });
  }
  const cotizacion = await cotizarPanal(panalId, input);
  if (!cotizacion.valida) {
    throw new HttpError(
      400,
      `El precio final (${cotizacion.precioFinalUnidad} USDC) no cubre los adelantos pagados: minimo ${cotizacion.precioMinimoPermitido} USDC por celda`,
      { code: 'precio_invalido' },
    );
  }
  const horas = Number(input.horasCobro ?? env.PANAL_COBRO_HORAS);
  const finRecoleccion = (await chainNow()) + Math.round(horas * 3600);
  const tx = await abrirRecoleccion(panalId, cotizacion.precioFinalUnidadRaw, finRecoleccion);

  const { abejas, ...quote } = cotizacion;
  await panalRef(panalId).update({
    quote: { ...quote, horasCobro: horas, aplicadaPor: actor, aplicadaAt: new Date().toISOString() },
    'txs.cobro': txRef(tx),
    collectionExpired: false,
  });
  await guardarCotizacion(panalId, { ...cotizacion, horasCobro: horas }, { estado: 'aplicada', actor, tx });
  await sincronizarPanal(panalId);
  return { ...cotizacion, finRecoleccion, transaction: tx };
}

/** Cobro vencido sin el minimo pagado: da otro plazo (extenderPlazo). */
export async function extenderCobro(panalId, horas) {
  const onchain = await onchainOrThrow(panalId);
  if (onchain.estado !== ESTADO.RECOLECTANDO) {
    throw new HttpError(400, 'El Panal no esta cobrando', { code: 'etapa_invalida' });
  }
  const tx = await extenderPlazo(panalId, (await chainNow()) + Math.round(Number(horas) * 3600));
  await panalRef(panalId).update({ 'txs.extension': txRef(tx), collectionExpired: false });
  await sincronizarPanal(panalId);
  return tx;
}

export async function cancelar(panalId) {
  const tx = await cancelarPanal(panalId);
  await panalRef(panalId).update({ 'txs.cancelar': txRef(tx) });
  await sincronizarPanal(panalId);
  return tx;
}

/* ── Sellado y ExaKeys ────────────────────────────────────────────────── */

async function asignarTokenId(panalId) {
  return db.runTransaction(async (tx) => {
    const ref = panalRef(panalId);
    const panal = (await tx.get(ref)).data() ?? {};
    if (panal.tokenId) return Number(panal.tokenId);
    const counterRef = db.collection('counters').doc('exakeys');
    const counter = await tx.get(counterRef);
    const tokenId = Number(counter.data()?.next ?? 1);
    tx.set(counterRef, { next: tokenId + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(ref, { tokenId });
    return tokenId;
  });
}

/**
 * Acuna en HashKey una ExaKey por cada unidad pagada (quedan en custodia de la master) y crea en
 * `exakeys` un documento por unidad con su dueno. Idempotente: ids deterministas `{tokenId}-{serial}`.
 */
async function emitirExaKeys(panalId) {
  const panal = await loadPanal(panalId);
  if (panal.exakeys?.docsCreated) return panal.exakeys;

  const onchain = await onchainOrThrow(panalId);
  const unidades = Number(onchain.unidadesPagadasCompletas);
  const tokenId = await asignarTokenId(panalId);
  const mint = await crearExaKeys(tokenId, unidades);
  const custodio = getMasterAccount().address;

  const fresh = await loadPanal(panalId);
  const duenos = (fresh.members ?? []).filter((m) => m.paidComplete && m.units > 0);
  const docs = [];
  let serial = 0;
  for (const m of duenos) {
    for (let i = 0; i < m.units; i++) {
      serial += 1;
      docs.push({
        id: `${tokenId}-${serial}`,
        data: {
          tokenId,
          serial,
          panalId,
          productName: String(fresh.description ?? '').slice(0, 120),
          photoUrl: fresh.photoUrl ?? '',
          unitPrice: fresh.finalUnitPrice ?? null,
          ownerUid: m.uid,
          ownerName: m.name ?? '',
          ownerWallet: m.wallet ?? '',
          custodian: custodio,
          contractAddress: env.CONTRATO_HSK,
          chainId: hskChain.id,
          mintTransactionHash: mint.transactionHash ?? fresh.exakeys?.transactionHash ?? null,
          explorerUrl: mint.explorerUrl ?? fresh.exakeys?.explorerUrl ?? null,
          status: 'custodia',
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    }
  }
  if (serial !== unidades) {
    console.warn(`[exakeys] ${panalId}: ${unidades} unidades pagadas on-chain pero ${serial} con dueno en Firestore`);
  }
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 400)) batch.set(db.collection('exakeys').doc(d.id), d.data);
    await batch.commit();
  }

  const exakeys = {
    tokenId,
    units: unidades,
    withOwner: serial,
    contractAddress: env.CONTRATO_HSK,
    chainId: hskChain.id,
    custodian: custodio,
    transactionHash: mint.transactionHash ?? fresh.exakeys?.transactionHash ?? null,
    explorerUrl: mint.explorerUrl ?? fresh.exakeys?.explorerUrl ?? null,
    minted: true,
    docsCreated: true,
    at: new Date().toISOString(),
  };
  await panalRef(panalId).update({ exakeys });
  return exakeys;
}

/**
 * Cierra el Panal cuando vence el cobro con el minimo pagado: liberarFondos -> sellarPanal -> ExaKeys.
 * Retoma desde la etapa en la que se haya quedado si un paso fallo antes.
 */
export async function sellarYEmitir(panalId) {
  let onchain = await onchainOrThrow(panalId);

  if (onchain.estado === ESTADO.RECOLECTANDO) {
    if (onchain.finRecoleccion > (await chainNow())) {
      const vence = new Date(onchain.finRecoleccion * 1000).toISOString();
      throw new HttpError(400, `El cobro sigue abierto hasta ${vence}: el contrato no deja sellar antes`, {
        code: 'plazo_activo',
      });
    }
    if (onchain.unidadesPagadasCompletas < onchain.minimoUnidades) {
      await panalRef(panalId).update({ collectionExpired: true });
      throw new HttpError(
        400,
        `Solo ${onchain.unidadesPagadasCompletas} de ${onchain.minimoUnidades} celdas minimas pagaron el total: extiende el plazo o cancela`,
        { code: 'minimo_no_pagado' },
      );
    }
    await sincronizarPanal(panalId);
    const tx = await liberarFondos(panalId);
    await panalRef(panalId).update({ 'txs.liberar': txRef(tx) });
    onchain = await onchainOrThrow(panalId);
  }
  if (onchain.estado === ESTADO.LIBERADO) {
    const tx = await sellarPanal(panalId);
    await panalRef(panalId).update({ 'txs.sellar': txRef(tx) });
    onchain = await onchainOrThrow(panalId);
  }
  if (onchain.estado !== ESTADO.SELLADO) {
    throw new HttpError(400, `El Panal esta en etapa ${ETAPAS[onchain.estado]} y no se puede sellar`, {
      code: 'etapa_invalida',
    });
  }
  await sincronizarPanal(panalId);
  return emitirExaKeys(panalId);
}

/* ── Scheduler ────────────────────────────────────────────────────────── */

let revisando = false;

/** Sella los Panales cuyo cobro ya vencio con el minimo pagado y reintenta emisiones pendientes. */
export async function revisarPanales() {
  if (revisando || !env.CONTRATO_AVALANCH || !env.PRIVATE_KEY_MASTER) return;
  revisando = true;
  try {
    const snap = await db.collection('panales').where('stage', 'in', ['cobrando', 'liberado', 'sellado']).get();
    for (const doc of snap.docs) {
      const p = doc.data();
      if (String(p.contractAddress ?? '').toLowerCase() !== env.CONTRATO_AVALANCH.toLowerCase()) continue;
      const pendiente =
        (p.stage === 'cobrando' && Number(p.finRecoleccion ?? 0) <= nowUnix() && !p.collectionExpired) ||
        p.stage === 'liberado' ||
        (p.stage === 'sellado' && !p.exakeys?.docsCreated);
      if (!pendiente) continue;
      try {
        await sellarYEmitir(doc.id);
        console.log(`[scheduler] Panal ${doc.id} sellado y ExaKeys emitidas`);
      } catch (err) {
        console.warn(`[scheduler] Panal ${doc.id}: ${err?.message}`);
      }
    }
  } catch (err) {
    console.error(`[scheduler] ${err?.message}`);
  } finally {
    revisando = false;
  }
}

export function iniciarSchedulerPanales() {
  if (!env.PANAL_SCHEDULER_SEGUNDOS) return null;
  const timer = setInterval(revisarPanales, env.PANAL_SCHEDULER_SEGUNDOS * 1000);
  timer.unref();
  return timer;
}
