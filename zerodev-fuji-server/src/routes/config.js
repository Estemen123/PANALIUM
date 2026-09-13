import { Router } from 'express';
import { firebaseWebConfig, hasWebApiKey } from '../config/firebaseWeb.js';
import { chain } from '../config/chain.js';
import { env } from '../config/env.js';

/**
 * Configuracion publica que un cliente puede pedir en runtime en vez de hardcodearla.
 * Todo lo que sale de aqui es publico por diseno (la config del SDK web viaja en el bundle);
 * no se expone ni el service account, ni la master key, ni el RPC de ZeroDev.
 */
const router = Router();

/** GET /api/config/firebase — el mismo objeto que se le pasa a initializeApp() en el cliente */
router.get('/firebase', (_req, res) => {
  if (!hasWebApiKey) {
    return res.status(503).json({ error: 'Config web de Firebase no definida en el servidor', code: 'config_missing' });
  }
  // Cache corto: cambia solo si cambia el .env del servidor.
  res.set('Cache-Control', 'public, max-age=300');
  res.json(firebaseWebConfig);
});

/**
 * GET /api/config/chain — red on-chain y token de la app.
 *
 * El frontend lo usa para pedirle a MetaMask que cambie de red y para saber en que
 * moneda fondear: si `token` es null no hay ERC-20 configurado y se fondea en AVAX.
 */
router.get('/chain', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    id: chain.id,
    // MetaMask espera el chainId en hexadecimal.
    idHex: `0x${chain.id.toString(16)}`,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrl: env.AVALANCHE_RPC_URL,
    explorer: chain.blockExplorers?.default?.url ?? null,
    token: env.USDC_TOKEN_ADDRESS
      ? { symbol: 'USDC', address: env.USDC_TOKEN_ADDRESS, decimals: env.USDC_TOKEN_DECIMALS }
      : null,
  });
});

export default router;
