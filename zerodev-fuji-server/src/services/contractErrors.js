import { BaseError, ContractFunctionRevertedError, decodeErrorResult } from 'viem';
import { HttpError } from '../middleware/errors.js';

/** Mensajes legibles para los custom errors de EscrowPanales y ExaKey1155. */
const REVERT_MESSAGES = {
  PanalYaExiste: 'Ya existe un Panal con ese identificador en el contrato',
  PanalIdInvalido: 'Identificador de Panal invalido',
  PanalNoExiste: 'El Panal no existe en el contrato',
  CantidadInvalida: 'Las cantidades y el precio deben ser mayores a 0',
  ObjetivoMenorAlMinimo: 'La cantidad objetivo no puede ser menor a la minima',
  PlazoInvalido: 'La fecha limite debe ser futura',
  PlazoFinalizado: 'El plazo de este Panal ya termino',
  PlazoAunActivo: 'El plazo de cobro sigue abierto: hay que esperar a que venza',
  EstadoInvalido: 'El Panal no esta en la etapa correcta para esta operacion',
  AbejaYaParticipa: 'Ya participas en este Panal',
  AbejaNoParticipa: 'No participas en este Panal',
  PanalLleno: 'No quedan tantas celdas libres en este Panal',
  MinimoNoAlcanzado: 'El Panal todavia no alcanza el minimo de celdas',
  MinimoYaAlcanzado: 'El Panal ya alcanzo el minimo',
  PrecioFinalInvalido: 'El precio final no cubre los adelantos ya pagados',
  PagoYaCompleto: 'Ya pagaste el total de tus celdas',
  ReembolsoNoDisponible: 'No hay reembolso disponible para ti en este Panal',
  OwnableUnauthorizedAccount: 'La wallet master no es owner del contrato',
  ExaKeysYaCreadas: 'Las ExaKeys de este Panal ya fueron creadas',
};

/**
 * Traduce un revert a HttpError. Con UserOps el bundler no devuelve un ContractFunctionRevertedError
 * sino el texto "UserOperation reverted during simulation with reason: 0x...": decodificamos ese hex.
 */
export function toHttpError(err, abi) {
  if (!(err instanceof BaseError)) return err;
  let name = err.walk((e) => e instanceof ContractFunctionRevertedError)?.data?.errorName;
  let reason = name ? undefined : err.walk((e) => e instanceof ContractFunctionRevertedError)?.reason;
  if (!name && !reason) {
    const hex = `${err.details ?? ''} ${err.message}`.match(/reason:\s*"?(0x[0-9a-fA-F]{8,})/)?.[1];
    if (hex) {
      try {
        const decoded = decodeErrorResult({ abi, data: hex });
        name = decoded.errorName;
        if (name === 'Error') reason = String(decoded.args?.[0] ?? '');
      } catch {
        // Selector desconocido: dejamos el error original.
      }
    }
  }
  if (reason) {
    const message = /allowance|balance/i.test(reason) ? `USDC insuficiente para esta operacion (${reason})` : reason;
    return new HttpError(400, message, { code: 'contract_revert', details: reason });
  }
  if (name && name !== 'Error') {
    return new HttpError(400, REVERT_MESSAGES[name] ?? `El contrato rechazo la operacion (${name})`, {
      code: 'contract_revert',
      details: name,
    });
  }
  return err;
}
