import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { chain, entryPoint, kernelVersion, publicClient } from '../config/chain.js';
import { env } from '../config/env.js';
import { getOrCreateSignerKey } from './keyVault.js';

/** Paymaster de ZeroDev: patrocina el gas segun la policy configurada en el dashboard. */
const zerodevPaymaster = createZeroDevPaymasterClient({
  chain,
  transport: http(env.ZERODEV_RPC),
});

/** Cache en memoria de kernel clients. Evita reconstruir validator + account en cada request. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map(); // uid -> { client, expiresAt }

function cacheGet(uid) {
  const hit = cache.get(uid);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(uid);
    return null;
  }
  // refresca posicion LRU
  cache.delete(uid);
  cache.set(uid, hit);
  return hit.client;
}

function cacheSet(uid, client) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(uid, { client, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Construye (o recupera del cache) el Kernel account client del usuario.
 * El index permite tener varias smart accounts por signer; lo dejamos en 0.
 */
export async function getKernelClient(uid, { index = 0n } = {}) {
  const cached = cacheGet(uid);
  if (cached) return cached;

  const { privateKey } = await getOrCreateSignerKey(uid);
  const signer = privateKeyToAccount(privateKey);

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion,
    index,
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain,
    client: publicClient,
    bundlerTransport: http(env.ZERODEV_RPC),
    paymaster: {
      getPaymasterData(userOperation) {
        return zerodevPaymaster.sponsorUserOperation({ userOperation });
      },
    },
  });

  cacheSet(uid, kernelClient);
  return kernelClient;
}

export async function getSmartAccountAddress(uid) {
  const client = await getKernelClient(uid);
  return client.account.address;
}

export function invalidateKernelClient(uid) {
  cache.delete(uid);
}

/**
 * Serializa las UserOps de un mismo usuario.
 * Dos UserOps concurrentes de la misma cuenta chocan por nonce y una se cae.
 * OJO: este lock es por proceso. Con varias instancias necesitas un lock distribuido (Redis).
 */
const locks = new Map();

export async function withAccountLock(uid, fn) {
  const previous = locks.get(uid) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => (release = resolve));
  const chained = previous.then(() => current);
  locks.set(uid, chained);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(uid) === chained) locks.delete(uid);
  }
}
