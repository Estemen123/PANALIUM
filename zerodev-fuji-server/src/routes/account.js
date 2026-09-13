import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/errors.js';
import { getAccountInfo, getTokenBalance } from '../services/wallet.js';
import { ensureWalletSafe } from '../services/walletRegistry.js';
import { explorerAddressUrl } from '../config/chain.js';

const router = Router();
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Direccion EVM invalida');

router.use(requireAuth);

/**
 * GET /api/account/me
 * Devuelve (y crea si no existia) la smart account del usuario autenticado.
 * La direccion es contrafactual: existe aunque el contrato aun no este desplegado.
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const info = await getAccountInfo(req.user.uid);
    // Deja constancia en la coleccion `wallet` por si el usuario llego aqui sin pasar por login.
    const wallet = await ensureWalletSafe(req.user.uid, 'account');
    res.json({
      uid: req.user.uid,
      ...info,
      walletDocId: wallet?.id ?? null,
      explorerUrl: explorerAddressUrl(info.address),
    });
  }),
);

/** GET /api/account/token/:token — balance de un ERC-20 */
router.get(
  '/token/:token',
  validate(z.object({ token: addressSchema }), 'params'),
  asyncHandler(async (req, res) => {
    res.json(await getTokenBalance(req.user.uid, req.params.token));
  }),
);

export default router;
