import { readFileSync } from 'node:fs';
import { env } from '../config/env.js';
import { hskChain, hskExplorerTxUrl, hskPublicClient, hskTransport } from '../config/hsk.js';
import { HttpError } from '../middleware/errors.js';
import { getMasterAccount, writeAsMaster } from './masterWallet.js';

/**
 * Contrato ExaKey1155 en HashKey Chain Testnet (CONTRATO_HSK).
 * crearExaKeys(panalId, unidades) acuna `unidades` copias del token id = panalId a la wallet master,
 * que queda como custodio. Solo se puede llamar una vez por panalId. La propiedad de cada unidad
 * (que Abeja es duena de que ExaKey) se lleva en Firestore, coleccion `exakeys`.
 */
export const exaKeyAbi = JSON.parse(
  readFileSync(new URL('../../ABIS/ExaKey1155.abi.json', import.meta.url), 'utf8'),
);

function assertConfigured() {
  if (!env.CONTRATO_HSK) {
    throw new HttpError(503, 'El contrato ExaKey1155 no esta configurado en el servidor', {
      code: 'exakey_not_configured',
      details: 'Falta CONTRATO_HSK en el .env',
    });
  }
}

const read = (functionName, args = []) =>
  hskPublicClient.readContract({ address: env.CONTRATO_HSK, abi: exaKeyAbi, functionName, args });

export const exaKeysRegistradas = (tokenId) => read('panalesRegistrados', [BigInt(tokenId)]);

export const balanceCustodio = (tokenId) => read('balanceOf', [getMasterAccount().address, BigInt(tokenId)]);

/** Acuna las ExaKeys del Panal. Idempotente: si ya existen, devuelve `{ yaExistian: true }`. */
export async function crearExaKeys(tokenId, unidades) {
  assertConfigured();
  if (await exaKeysRegistradas(tokenId)) {
    return { yaExistian: true, custodio: getMasterAccount().address };
  }
  const tx = await writeAsMaster({
    client: hskPublicClient,
    transport: hskTransport,
    explorerTxUrl: hskExplorerTxUrl,
    address: env.CONTRATO_HSK,
    abi: exaKeyAbi,
    functionName: 'crearExaKeys',
    args: [BigInt(tokenId), BigInt(unidades)],
  });
  return { ...tx, yaExistian: false, custodio: getMasterAccount().address, chainId: hskChain.id };
}
