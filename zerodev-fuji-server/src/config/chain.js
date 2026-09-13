import { createPublicClient, fallback, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { env } from './env.js';

if (env.CHAIN_ID !== avalancheFuji.id) {
  throw new Error(
    `CHAIN_ID=${env.CHAIN_ID} no coincide con Avalanche Fuji (${avalancheFuji.id})`,
  );
}

export const chain = avalancheFuji;

/** EntryPoint 0.7 + Kernel v3.1 es la combinacion recomendada para proyectos nuevos. */
export const entryPoint = getEntryPoint('0.7');
export const kernelVersion = KERNEL_V3_1;

const rpcUrls = [
  env.AVALANCHE_RPC_URL,
  ...env.AVALANCHE_RPC_FALLBACKS.split(',').map((s) => s.trim()).filter(Boolean),
].filter((url, i, all) => all.indexOf(url) === i);

/**
 * Transporte de Fuji con respaldo. Sin reintentos por RPC: ante un 429 el RPC publico de Avalanche manda
 * `Retry-After` de ~30 minutos y viem lo respeta, dejando la peticion colgada. Mejor fallar rapido y
 * pasar al siguiente RPC.
 */
export const fujiTransport = fallback(
  rpcUrls.map((url) => http(url, { batch: true, timeout: 12_000, retryCount: 0 })),
  { rank: false, retryCount: 1 },
);

/** Cliente de lectura. Apunta a RPCs de Avalanche propios, no al de ZeroDev. */
export const publicClient = createPublicClient({ chain, transport: fujiTransport });

export const explorerTxUrl = (hash) => `${chain.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddressUrl = (addr) => `${chain.blockExplorers.default.url}/address/${addr}`;
