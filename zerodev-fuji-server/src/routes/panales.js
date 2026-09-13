import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { parseUnits } from 'viem';
import { z } from 'zod';
import { db, FieldValue } from '../config/firebase.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import { crearPanal, leerPanal, obtenerPorcentajeAdelanto, unirseAlPanal } from '../services/escrowPanales.js';
import { imageUpload, storeImage } from '../services/images.js';

/**
 * Panales (grupos de compra) respaldados por el contrato EscrowPanales:
 *   GET  /api/panales/config  -> { advancePercent, contractAddress }
 *   GET  /api/panales         -> { items }   con ?mine=1 solo donde el usuario participa
 *   GET  /api/panales/:id     -> { item }    incluye `onchain` leido del contrato
 *   POST /api/panales         multipart (photo?, type, description, link, minQuantity, targetUnits?,
 *                             unitPrice, deadline, units) -> { item }
 *   POST /api/panales/:id/join  { units } -> { item }
 *
 * Fundar un Panal obliga a reservar celdas: la smart account del usuario autenticado manda una UserOp
 * (patrocinada por el paymaster de ZeroDev) con approve del adelanto (40%) + crearPanal(..., unidadesCreador).
 * Solo si la UserOp se confirma se guarda el documento en Firestore.
 */
const router = Router();

// El gas de cada UserOp lo patrocina el paymaster de ZeroDev: limitamos por usuario.
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: { error: 'Demasiadas operaciones, intenta en un minuto', code: 'rate_limited' },
});

const units = z.coerce.number().int('Debe ser un entero').positive('Debe ser mayor a 0');

const createSchema = z
  .object({
    type: z.enum(['local', 'international']).default('local'),
    description: z.string().trim().min(1, 'La descripcion es obligatoria').max(2000),
    link: z.string().trim().min(1, 'El enlace es obligatorio').max(2048),
    minQuantity: units,
    targetUnits: units.optional(),
    unitPrice: z.coerce.number().positive('Debe ser mayor a 0'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe tener formato YYYY-MM-DD'),
    units,
  })
  .refine((v) => (v.targetUnits ?? v.minQuantity) >= v.minQuantity, {
    path: ['targetUnits'],
    message: 'No puede ser menor a la cantidad minima',
  })
  .refine((v) => v.units <= (v.targetUnits ?? v.minQuantity), {
    path: ['units'],
    message: 'No puedes reservar mas celdas que el total del Panal',
  });

const joinSchema = z.object({ units });

function parseOrThrow(schema, body) {
  // multipart llega con strings vacios para campos no enviados; los tratamos como ausentes.
  const cleaned = Object.fromEntries(Object.entries(body ?? {}).filter(([, v]) => v !== ''));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.');
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue?.message ?? 'Datos invalidos', {
      code: 'validation_error',
      details: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

/** Cierre de reservas: final del dia elegido (UTC), en segundos unix. */
function deadlineToUnix(deadline) {
  const seconds = Math.floor(Date.parse(`${deadline}T23:59:59Z`) / 1000);
  if (!Number.isFinite(seconds) || seconds <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(400, 'deadline: La fecha de cierre debe ser futura', { code: 'validation_error' });
  }
  return seconds;
}

function timestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function serializeMember(m) {
  return {
    uid: String(m.uid ?? ''),
    name: String(m.name ?? ''),
    wallet: String(m.wallet ?? ''),
    units: Number(m.units ?? 0),
    advancePaid: Number(m.advancePaid ?? 0),
    transactionHash: String(m.transactionHash ?? ''),
    explorerUrl: String(m.explorerUrl ?? ''),
    joinedAt: String(m.joinedAt ?? ''),
  };
}

function serializePanal(id, data) {
  const targetUnits = Number(data.targetUnits ?? 0);
  const currentUnits = Number(data.currentUnits ?? 0);
  return {
    id,
    type: String(data.type ?? 'local'),
    photoUrl: String(data.photoUrl ?? ''),
    description: String(data.description ?? ''),
    link: String(data.link ?? ''),
    minQuantity: Number(data.minQuantity ?? 0),
    targetUnits,
    currentUnits,
    unitPrice: Number(data.unitPrice ?? 0),
    deadline: String(data.deadline ?? ''),
    finReservas: Number(data.finReservas ?? 0),
    status: targetUnits > 0 && currentUnits >= targetUnits ? 'funded' : 'open',
    members: Array.isArray(data.members) ? data.members.map(serializeMember) : [],
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    contractAddress: String(data.contractAddress ?? ''),
    transactionHash: String(data.transactionHash ?? ''),
    explorerUrl: String(data.explorerUrl ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdByName: String(data.createdByName ?? ''),
    createdAt: timestampToIso(data.createdAt),
  };
}

async function displayNameOf(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? String(snap.data()?.displayName ?? '') : '';
}

function memberEntry(uid, name, payment, unitsReserved) {
  return {
    uid,
    name,
    wallet: payment.wallet,
    units: unitsReserved,
    advancePaid: payment.adelanto,
    advancePaidRaw: payment.adelantoRaw,
    transactionHash: payment.transactionHash,
    explorerUrl: payment.explorerUrl,
    // serverTimestamp no se permite dentro de arrays.
    joinedAt: new Date().toISOString(),
  };
}

router.use(requireAuth);

/** GET /api/panales/config — porcentaje de adelanto que cobra el contrato */
router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    const { numerador, base } = await obtenerPorcentajeAdelanto();
    res.json({
      advancePercent: (Number(numerador) * 100) / Number(base),
      contractAddress: env.CONTRATO_AVALANCH,
    });
  }),
);

/** GET /api/panales — mas reciente primero */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const mine = req.query.mine === '1' || req.query.mine === 'true';
    const query = mine
      ? db.collection('panales').where('memberIds', 'array-contains', req.user.uid)
      : db.collection('panales').orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    // Solo los Panales del contrato actual: los creados en despliegues anteriores no existen en este.
    const contract = String(env.CONTRATO_AVALANCH ?? '').toLowerCase();
    const items = snapshot.docs
      .map((doc) => serializePanal(doc.id, doc.data()))
      .filter((item) => item.contractAddress.toLowerCase() === contract);
    if (mine) items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ items });
  }),
);

/** GET /api/panales/:id — documento de Firestore + estado on-chain */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const snap = await db.collection('panales').doc(req.params.id).get();
    if (!snap.exists) throw new HttpError(404, 'Panal no encontrado', { code: 'not_found' });
    const onchain = await leerPanal(snap.id);
    res.json({ item: { ...serializePanal(snap.id, snap.data() ?? {}), onchain } });
  }),
);

/** POST /api/panales — crea el Panal en el contrato, cobra el adelanto al fundador y lo guarda */
router.post(
  '/',
  writeLimiter,
  imageUpload.single('photo'),
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(createSchema, req.body);
    const { uid } = req.user;
    const { units: reserved, ...panal } = input;
    const targetUnits = panal.targetUnits ?? panal.minQuantity;
    const finReservas = deadlineToUnix(panal.deadline);
    const precioEstimadoUnidad = parseUnits(panal.unitPrice.toFixed(env.USDC_TOKEN_DECIMALS), env.USDC_TOKEN_DECIMALS);

    // El id del documento de Firestore es el panalId del contrato.
    const ref = db.collection('panales').doc();

    // UserOp de la smart account del usuario (paymaster ZeroDev): approve del 40% + crearPanal.
    // Es atomica: si el pago no alcanza, el Panal tampoco se crea on-chain.
    const payment = await crearPanal(uid, {
      panalId: ref.id,
      precioEstimadoUnidad,
      minimoUnidades: panal.minQuantity,
      objetivoUnidades: targetUnits,
      finReservas,
      unidadesCreador: reserved,
    });

    // La foto se sube despues de confirmar on-chain para no dejar imagenes huerfanas.
    const photo = req.file ? await storeImage(req.file, 'panales', uid) : { photoUrl: '', photoPath: '' };
    const name = await displayNameOf(uid);

    await ref.set({
      ...panal,
      targetUnits,
      currentUnits: reserved,
      finReservas,
      ...photo,
      members: [memberEntry(uid, name, payment, reserved)],
      memberIds: [uid],
      contractAddress: env.CONTRATO_AVALANCH,
      userOpHash: payment.userOpHash,
      transactionHash: payment.transactionHash,
      explorerUrl: payment.explorerUrl,
      createdBy: uid,
      createdByName: name,
      createdAt: FieldValue.serverTimestamp(),
    });
    const created = await ref.get();
    res.status(201).json({ item: serializePanal(created.id, created.data() ?? {}) });
  }),
);

/** POST /api/panales/:id/join — la Abeja reserva celdas pagando el adelanto */
router.post(
  '/:id/join',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { units: reserved } = parseOrThrow(joinSchema, req.body);
    const { uid } = req.user;
    const ref = db.collection('panales').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Panal no encontrado', { code: 'not_found' });

    const current = serializePanal(snap.id, snap.data() ?? {});
    if (current.memberIds.includes(uid)) {
      throw new HttpError(400, 'Ya reservaste celdas en este Panal', { code: 'already_member' });
    }
    if (reserved > current.targetUnits - current.currentUnits) {
      throw new HttpError(400, 'No quedan tantas celdas libres en este Panal', { code: 'panal_full' });
    }

    const payment = await unirseAlPanal(uid, { panalId: ref.id, unidades: reserved });

    await ref.update({
      members: FieldValue.arrayUnion(memberEntry(uid, await displayNameOf(uid), payment, reserved)),
      memberIds: FieldValue.arrayUnion(uid),
      currentUnits: FieldValue.increment(reserved),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    res.json({ item: serializePanal(updated.id, updated.data() ?? {}) });
  }),
);

export default router;
