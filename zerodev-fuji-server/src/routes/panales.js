import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { parseUnits } from 'viem';
import { z } from 'zod';
import { db, FieldValue } from '../config/firebase.js';
import { env } from '../config/env.js';
import { rejectAdmin, requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import {
  aumentarParticipacion,
  crearPanal,
  leerPanal,
  obtenerPorcentajeAdelanto,
  pagarSaldo,
  reembolsar,
  unirseAlPanal,
} from '../services/escrowPanales.js';
import { imageUpload, storeImage } from '../services/images.js';
import {
  abrirCobro,
  cancelar,
  estimarCotizacion,
  extenderCobro,
  iniciarNegociacion,
  negociarSiEstaLleno,
  registrarMiembro,
  registrarPago,
  sellarYEmitir,
  sincronizarPanal,
} from '../services/panalLifecycle.js';

/**
 * Panales (grupos de compra) respaldados por EscrowPanales (Fuji) y ExaKey1155 (HashKey).
 *
 * Abejas (smart account + paymaster de ZeroDev):
 *   GET  /api/panales/config            -> { advancePercent, contractAddress, collectionHours, defaultProfitPercent }
 *   GET  /api/panales                   -> { items }  (?mine=1 solo donde participa)
 *   GET  /api/panales/:id               -> { item }   incluye `onchain`
 *   POST /api/panales                   multipart: funda el Panal pagando el adelanto de `units`
 *   POST /api/panales/:id/join          { units }  reservando: adelanto / cobrando: pago completo
 *   POST /api/panales/:id/aumentar      { units }  celdas extra para quien ya participa
 *   POST /api/panales/:id/pagar-saldo   paga el restante al precio final
 *   POST /api/panales/:id/reembolsar    recupera lo pagado (cancelado, o sellado sin pagar el restante)
 *
 * Admin (wallet master):
 *   POST /api/panales/:id/negociacion           iniciarCotizacion
 *   POST /api/panales/:id/cotizacion/estimar    calcula el precio final (no toca la cadena)
 *   POST /api/panales/:id/cotizacion            abrirRecoleccion con el precio final y el plazo de cobro
 *   POST /api/panales/:id/extender              { hours } nuevo plazo si vencio sin el minimo pagado
 *   POST /api/panales/:id/sellar                liberarFondos + sellarPanal + ExaKeys en HashKey
 *   POST /api/panales/:id/cancelar              cancelarPanal
 *   POST /api/panales/:id/sync                  relee la cadena y actualiza Firestore
 */
const router = Router();

// Cada UserOp la patrocina el paymaster de ZeroDev: limitamos por usuario.
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: { error: 'Demasiadas operaciones, intenta en un minuto', code: 'rate_limited' },
});

const units = z.coerce.number().int('Debe ser un entero').positive('Debe ser mayor a 0');
const usdc = z.coerce.number().min(0, 'No puede ser negativo');

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

const unitsSchema = z.object({ units });

const quoteSchema = z.object({
  precioProveedorUnidad: z.coerce.number().positive('El precio del proveedor debe ser mayor a 0'),
  envioTotal: usdc.default(0),
  otrosCostos: usdc.default(0),
  gananciaPorcentaje: z.coerce.number().min(0).max(1000).default(env.PANAL_GANANCIA_PORCENTAJE),
  horasCobro: z.coerce.number().positive().max(24 * 30).optional(),
});

const extendSchema = z.object({ hours: z.coerce.number().positive().max(24 * 30).default(env.PANAL_COBRO_HORAS) });

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
  const paidTotal = Number(m.paidTotal ?? m.advancePaid ?? 0);
  return {
    uid: String(m.uid ?? ''),
    name: String(m.name ?? ''),
    wallet: String(m.wallet ?? ''),
    units: Number(m.units ?? 0),
    paidTotal,
    paidComplete: Boolean(m.paidComplete),
    transactionHash: String(m.lastTransactionHash ?? m.transactionHash ?? ''),
    explorerUrl: String(m.lastExplorerUrl ?? m.explorerUrl ?? ''),
    joinedAt: String(m.joinedAt ?? ''),
  };
}

function serializePanal(id, data) {
  return {
    id,
    type: String(data.type ?? 'local'),
    photoUrl: String(data.photoUrl ?? ''),
    description: String(data.description ?? ''),
    link: String(data.link ?? ''),
    minQuantity: Number(data.minQuantity ?? 0),
    targetUnits: Number(data.targetUnits ?? 0),
    currentUnits: Number(data.currentUnits ?? 0),
    paidUnits: Number(data.paidUnits ?? 0),
    unitPrice: Number(data.unitPrice ?? 0),
    finalUnitPrice: data.finalUnitPrice == null ? null : Number(data.finalUnitPrice),
    deadline: String(data.deadline ?? ''),
    finReservas: Number(data.finReservas ?? 0),
    stage: String(data.stage ?? 'reservando'),
    collectionEndsAt: data.collectionEndsAt ?? null,
    collectionExpired: Boolean(data.collectionExpired),
    quote: data.quote ?? null,
    negotiation: data.negotiation ?? null,
    txs: data.txs ?? {},
    tokenId: data.tokenId == null ? null : Number(data.tokenId),
    exakeys: data.exakeys ?? null,
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

async function loadPanalDoc(id) {
  const snap = await db.collection('panales').doc(id).get();
  if (!snap.exists) throw new HttpError(404, 'Panal no encontrado', { code: 'not_found' });
  const data = snap.data() ?? {};
  if (String(data.contractAddress ?? '').toLowerCase() !== String(env.CONTRATO_AVALANCH ?? '').toLowerCase()) {
    throw new HttpError(410, 'Este Panal pertenece a un contrato anterior', { code: 'contrato_anterior' });
  }
  return data;
}

async function respondWithPanal(res, id, extra = {}) {
  const snap = await db.collection('panales').doc(id).get();
  res.json({ item: serializePanal(snap.id, snap.data() ?? {}), ...extra });
}

router.use(requireAuth);

const adminOnly = requireRole('admin');

/** GET /api/panales/config — parametros del contrato y del ciclo de vida */
router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    const { numerador, base } = await obtenerPorcentajeAdelanto();
    res.json({
      advancePercent: (Number(numerador) * 100) / Number(base),
      contractAddress: env.CONTRATO_AVALANCH,
      exakeyContract: env.CONTRATO_HSK ?? null,
      collectionHours: env.PANAL_COBRO_HORAS,
      defaultProfitPercent: env.PANAL_GANANCIA_PORCENTAJE,
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
  rejectAdmin,
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
      paidUnits: 0,
      finReservas,
      stage: 'reservando',
      onchainState: 0,
      ...photo,
      members: [
        {
          uid,
          name,
          wallet: payment.wallet,
          units: reserved,
          paidTotal: payment.monto,
          paidComplete: false,
          lastTransactionHash: payment.transactionHash,
          lastExplorerUrl: payment.explorerUrl,
          joinedAt: new Date().toISOString(),
        },
      ],
      memberIds: [uid],
      contractAddress: env.CONTRATO_AVALANCH,
      userOpHash: payment.userOpHash,
      transactionHash: payment.transactionHash,
      explorerUrl: payment.explorerUrl,
      txs: { crear: { hash: payment.transactionHash, explorerUrl: payment.explorerUrl, at: new Date().toISOString() } },
      createdBy: uid,
      createdByName: name,
      createdAt: FieldValue.serverTimestamp(),
    });
    await registrarPago(ref.id, { uid, tipo: 'adelanto', unidades: reserved, payment });
    await sincronizarPanal(ref.id);
    await negociarSiEstaLleno(ref.id);
    await respondWithPanal(res.status(201), ref.id);
  }),
);

/** Ejecuta una accion de la Abeja, la registra en `pagos` y resincroniza el Panal. */
function abejaAction(handler) {
  return [
    rejectAdmin,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const { uid } = req.user;
      const panalId = req.params.id;
      const data = await loadPanalDoc(panalId);
      const { payment, unidades } = await handler({ req, uid, panalId, data });
      await registrarMiembro(panalId, { uid, name: await displayNameOf(uid), payment });
      await registrarPago(panalId, { uid, tipo: payment.tipo, unidades, payment });
      await sincronizarPanal(panalId);
      await negociarSiEstaLleno(panalId);
      await respondWithPanal(res, panalId, { payment });
    }),
  ];
}

/** POST /api/panales/:id/join — reservando: paga el adelanto; cobrando: entra pagando el total */
router.post(
  '/:id/join',
  ...abejaAction(async ({ req, uid, panalId, data }) => {
    const { units: unidades } = parseOrThrow(unitsSchema, req.body);
    if ((data.memberIds ?? []).includes(uid)) {
      throw new HttpError(400, 'Ya participas en este Panal: usa "aumentar participacion"', { code: 'already_member' });
    }
    return { payment: await unirseAlPanal(uid, { panalId, unidades }), unidades };
  }),
);

/** POST /api/panales/:id/aumentar — celdas extra para una Abeja que ya participa */
router.post(
  '/:id/aumentar',
  ...abejaAction(async ({ req, uid, panalId }) => {
    const { units: unidadesExtra } = parseOrThrow(unitsSchema, req.body);
    const payment = await aumentarParticipacion(uid, { panalId, unidadesExtra });
    return { payment, unidades: payment.unidades };
  }),
);

/** POST /api/panales/:id/pagar-saldo — paga el restante y las comisiones al precio final */
router.post(
  '/:id/pagar-saldo',
  ...abejaAction(async ({ uid, panalId }) => ({ payment: await pagarSaldo(uid, { panalId }) })),
);

/** POST /api/panales/:id/reembolsar — recupera lo pagado */
router.post(
  '/:id/reembolsar',
  ...abejaAction(async ({ uid, panalId }) => ({ payment: await reembolsar(uid, { panalId }) })),
);

/* ── Admin ────────────────────────────────────────────────────────────── */

function adminAction(handler) {
  return [
    adminOnly,
    asyncHandler(async (req, res) => {
      const panalId = req.params.id;
      await loadPanalDoc(panalId);
      const result = await handler({ req, panalId, actor: req.user.uid });
      await respondWithPanal(res, panalId, { result });
    }),
  ];
}

router.post(
  '/:id/negociacion',
  ...adminAction(({ panalId, actor }) => iniciarNegociacion(panalId, actor)),
);

/** Solo calcula: no cambia la etapa ni toca la cadena */
router.post(
  '/:id/cotizacion/estimar',
  adminOnly,
  asyncHandler(async (req, res) => {
    await loadPanalDoc(req.params.id);
    const input = parseOrThrow(quoteSchema, req.body);
    res.json({ quote: await estimarCotizacion(req.params.id, input, req.user.uid) });
  }),
);

router.post(
  '/:id/cotizacion',
  ...adminAction(({ req, panalId, actor }) => abrirCobro(panalId, parseOrThrow(quoteSchema, req.body), actor)),
);

router.post(
  '/:id/extender',
  ...adminAction(({ req, panalId }) => extenderCobro(panalId, parseOrThrow(extendSchema, req.body).hours)),
);

router.post(
  '/:id/sellar',
  ...adminAction(({ panalId }) => sellarYEmitir(panalId)),
);

router.post(
  '/:id/cancelar',
  ...adminAction(({ panalId }) => cancelar(panalId)),
);

router.post(
  '/:id/sync',
  ...adminAction(({ panalId }) => sincronizarPanal(panalId).then(() => null)),
);

export default router;
