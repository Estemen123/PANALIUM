import { Router } from 'express';
import { isAddress, parseUnits } from 'viem';
import { z } from 'zod';
import { chain, publicClient } from '../config/chain.js';
import { db } from '../config/firebase.js';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError, asyncHandler, validate } from '../middleware/errors.js';
import {
  abrirRecoleccion,
  cancelarPanal,
  extenderPlazo,
  iniciarCotizacion,
  leerContrato,
  leerPanal,
  liberarFondos,
  sellarPanal,
  transferirPropiedad,
} from '../services/escrowPanales.js';
import { ETAPAS, sincronizarPanal } from '../services/panalLifecycle.js';

/**
 * Consola del owner de EscrowPanales: llama directo a las funciones onlyOwner con la wallet master.
 * A diferencia de /api/panales/:id/* no hay reglas de negocio encima (cotizacion, ExaKeys): el
 * contrato valida y la simulacion previa devuelve el revert legible. Tras cada tx se resincroniza
 * Firestore; si se sella a mano, el scheduler emite las ExaKeys pendientes.
 *
 *   GET  /api/admin/escrow                              estado global del contrato
 *   GET  /api/admin/escrow/panales                      Panales del contrato actual + struct on-chain
 *   POST /api/admin/escrow/panales/:id/iniciarCotizacion
 *   POST /api/admin/escrow/panales/:id/abrirRecoleccion  { precioFinalUnidad, horas }
 *   POST /api/admin/escrow/panales/:id/extenderPlazo     { horas }
 *   POST /api/admin/escrow/panales/:id/liberarFondos
 *   POST /api/admin/escrow/panales/:id/sellarPanal
 *   POST /api/admin/escrow/panales/:id/cancelarPanal
 *   POST /api/admin/escrow/transferOwnership             { newOwner, confirm }
 *
 * renounceOwnership no se expone: dejaria el contrato sin owner y los fondos de los Panales
 * abiertos sin forma de avanzar ni cancelar.
 */
const router = Router();

router.use(requireAuth, requireRole('admin'));

const horas = z.coerce.number().positive('Debe ser mayor a 0').max(24 * 30, 'Maximo 30 dias');

// Clave `txs.*` que usa panalLifecycle para cada transicion, asi el frontend ve la misma historia.
const TX_KEY = {
  iniciarCotizacion: 'negociacion',
  abrirRecoleccion: 'cobro',
  extenderPlazo: 'extension',
  liberarFondos: 'liberar',
  sellarPanal: 'sellar',
  cancelarPanal: 'cancelar',
};

const chainNow = async () => Number((await publicClient.getBlock()).timestamp);

const ACTIONS = {
  iniciarCotizacion: { run: (id) => iniciarCotizacion(id) },
  abrirRecoleccion: {
    schema: z.object({
      precioFinalUnidad: z.coerce.number().positive('El precio final debe ser mayor a 0'),
      horas: horas.default(env.PANAL_COBRO_HORAS),
    }),
    run: async (id, body) => {
      const precioRaw = parseUnits(body.precioFinalUnidad.toFixed(env.USDC_TOKEN_DECIMALS), env.USDC_TOKEN_DECIMALS);
      return abrirRecoleccion(id, precioRaw, (await chainNow()) + Math.round(body.horas * 3600));
    },
    extra: { collectionExpired: false },
  },
  extenderPlazo: {
    schema: z.object({ horas: horas.default(env.PANAL_COBRO_HORAS) }),
    run: async (id, body) => extenderPlazo(id, (await chainNow()) + Math.round(body.horas * 3600)),
    extra: { collectionExpired: false },
  },
  liberarFondos: { run: (id) => liberarFondos(id) },
  sellarPanal: { run: (id) => sellarPanal(id) },
  cancelarPanal: { run: (id) => cancelarPanal(id) },
};

function serializeOnchain(onchain) {
  if (!onchain) return null;
  return { ...onchain, etapa: ETAPAS[onchain.estado] ?? 'desconocida' };
}

/** GET /api/admin/escrow */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ contract: await leerContrato(), explorerUrl: chain.blockExplorers.default.url });
  }),
);

/** GET /api/admin/escrow/panales */
router.get(
  '/panales',
  asyncHandler(async (_req, res) => {
    const snapshot = await db.collection('panales').orderBy('createdAt', 'desc').get();
    const contract = String(env.CONTRATO_AVALANCH ?? '').toLowerCase();
    const docs = snapshot.docs.filter((d) => String(d.data().contractAddress ?? '').toLowerCase() === contract);
    const items = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        const onchain = await leerPanal(doc.id).catch(() => null);
        return {
          id: doc.id,
          description: String(data.description ?? ''),
          createdByName: String(data.createdByName ?? ''),
          members: Array.isArray(data.members) ? data.members.length : 0,
          tokenId: data.tokenId == null ? null : Number(data.tokenId),
          exakeysEmitidas: Boolean(data.exakeys?.docsCreated),
          txs: data.txs ?? {},
          onchain: serializeOnchain(onchain),
        };
      }),
    );
    res.json({ items });
  }),
);

/** POST /api/admin/escrow/panales/:id/:fn — una funcion onlyOwner sobre un Panal */
router.post(
  '/panales/:id/:fn',
  asyncHandler(async (req, res) => {
    const { id, fn } = req.params;
    const action = Object.hasOwn(ACTIONS, fn) ? ACTIONS[fn] : null;
    if (!action) throw new HttpError(404, `Funcion ${fn} no disponible`, { code: 'not_found' });

    let body = {};
    if (action.schema) {
      const parsed = action.schema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new HttpError(400, `${issue.path.join('.') || 'body'}: ${issue.message}`, { code: 'validation_error' });
      }
      body = parsed.data;
    }

    const tx = await action.run(id, body);

    const ref = db.collection('panales').doc(id);
    if ((await ref.get()).exists) {
      await ref.update({
        [`txs.${TX_KEY[fn]}`]: { hash: tx.transactionHash, explorerUrl: tx.explorerUrl, at: new Date().toISOString() },
        ...(action.extra ?? {}),
      });
      await sincronizarPanal(id);
    }
    console.log(`[admin-escrow] ${req.user.uid} ${fn}(${id}) -> ${tx.transactionHash}`);
    res.json({ tx, onchain: serializeOnchain(await leerPanal(id)) });
  }),
);

const transferSchema = z
  .object({
    newOwner: z.string().trim().refine((v) => isAddress(v), 'Direccion EVM invalida'),
    confirm: z.string().trim(),
  })
  .refine((v) => v.confirm.toLowerCase() === v.newOwner.toLowerCase(), {
    path: ['confirm'],
    message: 'Escribe la misma direccion para confirmar',
  });

/**
 * POST /api/admin/escrow/transferOwnership
 * Al transferir, la wallet master deja de poder firmar las transiciones: el servidor pierde el control
 * del ciclo de vida de los Panales hasta que el nuevo owner la devuelva.
 */
router.post(
  '/transferOwnership',
  validate(transferSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const tx = await transferirPropiedad(req.body.newOwner);
    console.warn(`[admin-escrow] ${req.user.uid} transferOwnership(${req.body.newOwner}) -> ${tx.transactionHash}`);
    res.json({ tx, contract: await leerContrato() });
  }),
);

export default router;
