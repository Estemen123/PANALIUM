import { Router } from 'express';
import { db } from '../config/firebase.js';
import { requireAuth, resolveRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

/**
 * Recibos NFT (ExaKeys): un documento por unidad de producto de un Panal sellado.
 * On-chain todas estan en custodia de la wallet master; aqui se registra quien es dueno de cada una.
 *   GET /api/exakeys            -> { items }  las del usuario (admin: ?all=1 para todas)
 *   GET /api/exakeys?panalId=x  -> { items }  las de un Panal
 */
const router = Router();

function timestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function serializeExaKey(id, d) {
  return {
    id,
    tokenId: Number(d.tokenId ?? 0),
    serial: Number(d.serial ?? 0),
    panalId: String(d.panalId ?? ''),
    productName: String(d.productName ?? ''),
    photoUrl: String(d.photoUrl ?? ''),
    unitPrice: d.unitPrice == null ? null : Number(d.unitPrice),
    ownerUid: String(d.ownerUid ?? ''),
    ownerName: String(d.ownerName ?? ''),
    ownerWallet: String(d.ownerWallet ?? ''),
    custodian: String(d.custodian ?? ''),
    contractAddress: String(d.contractAddress ?? ''),
    chainId: Number(d.chainId ?? 0),
    mintTransactionHash: d.mintTransactionHash ?? null,
    explorerUrl: d.explorerUrl ?? null,
    status: String(d.status ?? 'custodia'),
    createdAt: timestampToIso(d.createdAt),
  };
}

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const isAdmin = (await resolveRole(req.user)) === 'admin';
    let query = db.collection('exakeys');
    if (req.query.panalId) query = query.where('panalId', '==', String(req.query.panalId));
    if (!(isAdmin && (req.query.all === '1' || req.query.panalId))) {
      query = query.where('ownerUid', '==', req.user.uid);
    }
    const snap = await query.get();
    const items = snap.docs
      .map((doc) => serializeExaKey(doc.id, doc.data()))
      .sort((a, b) => a.tokenId - b.tokenId || a.serial - b.serial);
    res.json({ items });
  }),
);

export default router;
