import { readFileSync } from 'node:fs';
import { BaseError, ContractFunctionRevertedError, decodeErrorResult, erc20Abi, formatUnits } from 'viem';
import { publicClient } from '../config/chain.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { getSmartAccountAddress } from './smartAccount.js';
import { sendBatch } from './wallet.js';

/**
 * Contrato EscrowPanales desplegado en Fuji (CONTRATO_AVALANCH).
 *
 * Crear un Panal y unirse los firma la smart account (ZeroDev Kernel) del usuario autenticado:
 * el contrato cobra el adelanto a quien llama con transferFrom, asi que cada operacion va en una
 * sola UserOp patrocinada por el paymaster de ZeroDev: approve(USDC -> escrow) + la llamada.
 */
export const escrowAbi = JSON.parse(
  readFileSync(new URL('../../ABIS/EscrowPanales.abi.json', import.meta.url), 'utf8'),
);

/** Mensajes legibles para los custom errors del contrato. */
const REVERT_MESSAGES = {
  PanalYaExiste: 'Ya existe un Panal con ese identificador en el contrato',
  PanalIdInvalido: 'Identificador de Panal invalido',
  CantidadInvalida: 'Las cantidades y el precio deben ser mayores a 0',
  ObjetivoMenorAlMinimo: 'La cantidad objetivo no puede ser menor a la minima',
  PlazoInvalido: 'La fecha de cierre debe ser futura',
  PanalNoExiste: 'El Panal no existe en el contrato',
  AbejaYaParticipa: 'Ya reservaste celdas en este Panal',
  PanalLleno: 'No quedan tantas celdas libres en este Panal',
  PlazoFinalizado: 'El plazo de reservas de este Panal ya termino',
  EstadoInvalido: 'El Panal ya no acepta reservas',
};

function assertConfigured() {
  if (!env.CONTRATO_AVALANCH || !env.USDC_TOKEN_ADDRESS) {
    throw new HttpError(503, 'El contrato de Panales no esta configurado en el servidor', {
      code: 'escrow_not_configured',
      details: 'Faltan CONTRATO_AVALANCH / USDC_TOKEN_ADDRESS en el .env',
    });
  }
}

/**
 * Traduce un revert a HttpError. Con UserOps el bundler no devuelve un ContractFunctionRevertedError
 * sino el texto "UserOperation reverted during simulation with reason: 0x...": decodificamos ese hex.
 */
function toHttpError(err) {
  if (!(err instanceof BaseError)) return err;
  let name = err.walk((e) => e instanceof ContractFunctionRevertedError)?.data?.errorName;
  let reason;
  if (!name) {
    const hex = `${err.details ?? ''} ${err.message}`.match(/reason:\s*"?(0x[0-9a-fA-F]{8,})/)?.[1];
    if (hex) {
      try {
        const decoded = decodeErrorResult({ abi: escrowAbi, data: hex });
        name = decoded.errorName;
        if (name === 'Error') reason = String(decoded.args?.[0] ?? '');
      } catch {
        // Selector desconocido: dejamos el error original.
      }
    }
  }
  if (reason) {
    const message = /allowance|balance/i.test(reason) ? `USDC insuficiente para el adelanto (${reason})` : reason;
    return new HttpError(400, message, { code: 'contract_revert', details: reason });
  }
  if (name) {
    return new HttpError(400, REVERT_MESSAGES[name] ?? `El contrato rechazo la operacion (${name})`, {
      code: 'contract_revert',
      details: name,
    });
  }
  return err;
}

let porcentajeAdelanto;

/** PORCENTAJE_ADELANTO / BASE_PORCENTAJES del contrato ({ numerador, base }). Constantes: se cachean. */
export async function obtenerPorcentajeAdelanto() {
  assertConfigured();
  if (!porcentajeAdelanto) {
    const [numerador, base] = await Promise.all([
      publicClient.readContract({ address: env.CONTRATO_AVALANCH, abi: escrowAbi, functionName: 'PORCENTAJE_ADELANTO' }),
      publicClient.readContract({ address: env.CONTRATO_AVALANCH, abi: escrowAbi, functionName: 'BASE_PORCENTAJES' }),
    ]);
    porcentajeAdelanto = { numerador, base };
  }
  return porcentajeAdelanto;
}

/** Adelanto en unidades minimas de USDC: precio * unidades * PORCENTAJE_ADELANTO / BASE_PORCENTAJES. */
export async function estimarAdelanto(precioUnidadRaw, unidades) {
  const { numerador, base } = await obtenerPorcentajeAdelanto();
  return (BigInt(precioUnidadRaw) * BigInt(unidades) * numerador) / base;
}

/** Lanza 400 si la smart account de la Abeja no tiene USDC para cubrir el adelanto. */
async function verificarSaldoAdelanto(uid, adelantoRaw) {
  const address = await getSmartAccountAddress(uid);
  const saldo = await publicClient.readContract({
    address: env.USDC_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
  if (saldo < adelantoRaw) {
    const fmt = (v) => formatUnits(v, env.USDC_TOKEN_DECIMALS);
    throw new HttpError(
      400,
      `Saldo insuficiente: el adelanto es ${fmt(adelantoRaw)} USDC y tu reserva tiene ${fmt(saldo)} USDC`,
      { code: 'saldo_insuficiente' },
    );
  }
  return address;
}

/** UserOp patrocinada desde la smart account del usuario: approve(adelanto) + llamada al escrow. */
async function pagarAdelantoYLlamar(uid, adelanto, functionName, args) {
  const wallet = await verificarSaldoAdelanto(uid, adelanto);

  let result;
  try {
    result = await sendBatch(uid, {
      calls: [
        {
          to: env.USDC_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [env.CONTRATO_AVALANCH, adelanto],
        },
        { to: env.CONTRATO_AVALANCH, abi: escrowAbi, functionName, args },
      ],
    });
  } catch (err) {
    throw toHttpError(err);
  }
  if (result.status !== 'success') {
    throw new HttpError(502, `La operacion ${functionName} revirtio en el contrato`, {
      code: 'tx_reverted',
      details: result.transactionHash,
    });
  }

  return {
    wallet,
    adelantoRaw: adelanto.toString(),
    adelanto: Number(formatUnits(adelanto, env.USDC_TOKEN_DECIMALS)),
    userOpHash: result.userOpHash,
    transactionHash: result.transactionHash,
    explorerUrl: result.explorerUrl,
  };
}

/**
 * El usuario autenticado funda el Panal y reserva sus celdas en la misma UserOp:
 * crearPanal(panalId, precioEstimadoUnidad, minimoUnidades, objetivoUnidades, finReservas, unidadesCreador)
 * El contrato cobra al creador el adelanto (40%) de `unidadesCreador`.
 */
export async function crearPanal(uid, { panalId, precioEstimadoUnidad, minimoUnidades, objetivoUnidades, finReservas, unidadesCreador }) {
  assertConfigured();
  const adelanto = await estimarAdelanto(precioEstimadoUnidad, unidadesCreador);
  return pagarAdelantoYLlamar(uid, adelanto, 'crearPanal', [
    panalId,
    BigInt(precioEstimadoUnidad),
    BigInt(minimoUnidades),
    BigInt(objetivoUnidades),
    BigInt(finReservas),
    BigInt(unidadesCreador),
  ]);
}

/** La Abeja reserva `unidades` celdas en un Panal existente pagando su adelanto. */
export async function unirseAlPanal(uid, { panalId, unidades }) {
  assertConfigured();
  const adelanto = await publicClient.readContract({
    address: env.CONTRATO_AVALANCH,
    abi: escrowAbi,
    functionName: 'calcularAdelanto',
    args: [panalId, BigInt(unidades)],
  });
  return pagarAdelantoYLlamar(uid, adelanto, 'unirseAlPanal', [panalId, BigInt(unidades)]);
}

/** Lectura on-chain del struct `panales(panalId)`. */
export async function leerPanal(panalId) {
  if (!env.CONTRATO_AVALANCH) return null;
  const [
    precioEstimadoUnidad,
    precioFinalUnidad,
    minimoUnidades,
    objetivoUnidades,
    unidadesReservadas,
    unidadesPagadasCompletas,
    fondosPagadosCompletos,
    finReservas,
    finRecoleccion,
    estado,
    existe,
  ] = await publicClient.readContract({
    address: env.CONTRATO_AVALANCH,
    abi: escrowAbi,
    functionName: 'panales',
    args: [panalId],
  });
  if (!existe) return null;
  return {
    precioEstimadoUnidad: precioEstimadoUnidad.toString(),
    precioFinalUnidad: precioFinalUnidad.toString(),
    minimoUnidades: minimoUnidades.toString(),
    objetivoUnidades: objetivoUnidades.toString(),
    unidadesReservadas: unidadesReservadas.toString(),
    unidadesPagadasCompletas: unidadesPagadasCompletas.toString(),
    fondosPagadosCompletos: fondosPagadosCompletos.toString(),
    finReservas: Number(finReservas),
    finRecoleccion: Number(finRecoleccion),
    // Indice del enum EscrowPanales.EstadoPanal (el ABI no trae los nombres).
    estado: Number(estado),
  };
}
