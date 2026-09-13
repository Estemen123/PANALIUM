import { createPublicClient, http } from 'viem';
import { hashkeyTestnet } from 'viem/chains';
import { env } from './env.js';

/** HashKey Chain Testnet: donde vive el contrato ExaKey1155 de los recibos NFT. */
export const hskChain = hashkeyTestnet;

export const hskTransport = http(env.HSK_RPC_URL, { timeout: 15_000, retryCount: 0 });

export const hskPublicClient = createPublicClient({ chain: hskChain, transport: hskTransport });

export const hskExplorerTxUrl = (hash) => `${hskChain.blockExplorers.default.url}/tx/${hash}`;
