import { createPublicClient, http } from 'viem';
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

/** Cliente de lectura. Apunta a un RPC de Avalanche propio, no al de ZeroDev. */
export const publicClient = createPublicClient({
  chain,
  transport: http(env.AVALANCHE_RPC_URL, {
    batch: true,
    retryCount: 3,
  }),
});

export const explorerTxUrl = (hash) => `${chain.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddressUrl = (addr) => `${chain.blockExplorers.default.url}/address/${addr}`;
