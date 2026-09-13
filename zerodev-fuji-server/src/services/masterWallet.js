import { createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { toHttpError } from './contractErrors.js';

/**
 * Wallet master (WALLET_MASTER / PRIVATE_KEY_MASTER): owner de EscrowPanales en Fuji y de ExaKey1155
 * en HashKey. Firma las transiciones de estado del Panal y es custodio de los recibos NFT.
 */
let account;

export function getMasterAccount() {
  if (!env.PRIVATE_KEY_MASTER) {
    throw new HttpError(503, 'La wallet master no esta configurada en el servidor', {
      code: 'master_not_configured',
      details: 'Falta PRIVATE_KEY_MASTER en el .env',
    });
  }
  if (!account) {
    const key = env.PRIVATE_KEY_MASTER.startsWith('0x') ? env.PRIVATE_KEY_MASTER : `0x${env.PRIVATE_KEY_MASTER}`;
    account = privateKeyToAccount(key);
    if (env.WALLET_MASTER && account.address.toLowerCase() !== env.WALLET_MASTER.toLowerCase()) {
      account = undefined;
      throw new HttpError(500, 'PRIVATE_KEY_MASTER no corresponde a WALLET_MASTER', { code: 'master_key_mismatch' });
    }
  }
  return account;
}

// Una cola por red: todas las tx de la master comparten nonce dentro de cada cadena.
const queues = new Map();
function enqueue(chainId, fn) {
  const run = (queues.get(chainId) ?? Promise.resolve()).then(fn, fn);
  queues.set(chainId, run.catch(() => {}));
  return run;
}

const walletClients = new Map();
function walletFor(chain, transport) {
  if (!walletClients.has(chain.id)) {
    walletClients.set(chain.id, createWalletClient({ account: getMasterAccount(), chain, transport }));
  }
  return walletClients.get(chain.id);
}

/**
 * Simula, firma con la master, envia y espera el recibo.
 * `client` es el publicClient de la red y `transport` el mismo transporte que usa;
 * `explorerTxUrl` arma el link del explorador.
 */
export function writeAsMaster({ client, transport, explorerTxUrl, address, abi, functionName, args }) {
  const wallet = walletFor(client.chain, transport);
  return enqueue(client.chain.id, async () => {
    try {
      const { request } = await client.simulateContract({ account: wallet.account, address, abi, functionName, args });
      const hash = await wallet.writeContract(request);
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== 'success') {
        throw new HttpError(502, `La transaccion ${functionName} revirtio`, { code: 'tx_reverted', details: hash });
      }
      return { transactionHash: hash, blockNumber: receipt.blockNumber.toString(), explorerUrl: explorerTxUrl(hash) };
    } catch (err) {
      throw toHttpError(err, abi);
    }
  });
}
