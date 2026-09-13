import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/errors.js';
import {
  aceptarOferta,
  cerrarOferta,
  comprar,
  listarMercado,
  ofertar,
  publicar,
  retirar,
} from '../services/mercado.js';

/**
 * Mercado de Abejas (web2): reventa de Hexakeys. Solo cambia el dueno en Firestore.
 *   GET  /api/mercado                                     -> { items, sales }
 *   POST /api/mercado                                     { tokenId, amount, askPrice } publica
 *   POST /api/mercado/:id/retirar                         el vendedor la saca del Mercado
 *   POST /api/mercado/:id/comprar                         { amount } compra al precio publicado
 *   POST /api/mercado/:id/ofertas                         { amount, price } oferta (o actualiza la propia)
 *   POST /api/mercado/:id/ofertas/:offerId/aceptar        el vendedor acepta: traspaso al precio ofertado
 *   POST /api/mercado/:id/ofertas/:offerId/rechazar       el vendedor la rechaza
 *   POST /api/mercado/:id/ofertas/:offerId/retirar        quien oferto la retira
 * Todas responden con el Mercado actualizado ({ items, sales }) para refrescar la pantalla de una vez.
 */
const router = Router();

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: { error: 'Demasiadas operaciones, intenta en un minuto', code: 'rate_limited' },
});

const celdas = z.coerce.number().int('Las celdas deben ser un entero').positive('Debe ser al menos 1 celda');
const precio = z.coerce.number().positive('El precio debe ser mayor a 0').max(1_000_000, 'Precio demasiado alto');

const publishSchema = z.object({ tokenId: z.coerce.number().int().nonnegative(), amount: celdas, askPrice: precio });
const buySchema = z.object({ amount: celdas });
const offerSchema = z.object({ amount: celdas, price: precio });

router.use(requireAuth);

const respond = async (req, res, extra = {}) => res.json({ ...(await listarMercado(req.user.uid)), ...extra });

router.get('/', asyncHandler((req, res) => respond(req, res)));

router.post(
  '/',
  writeLimiter,
  validate(publishSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const listingId = await publicar(req.user.uid, req.body);
    res.status(201);
    await respond(req, res, { listingId });
  }),
);

router.post(
  '/:id/retirar',
  writeLimiter,
  asyncHandler(async (req, res) => {
    await retirar(req.user.uid, req.params.id);
    await respond(req, res);
  }),
);

router.post(
  '/:id/comprar',
  writeLimiter,
  validate(buySchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const sale = await comprar(req.user.uid, req.params.id, req.body.amount);
    await respond(req, res, { sale });
  }),
);

router.post(
  '/:id/ofertas',
  writeLimiter,
  validate(offerSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const offerId = await ofertar(req.user.uid, req.params.id, req.body);
    await respond(req, res, { offerId });
  }),
);

router.post(
  '/:id/ofertas/:offerId/aceptar',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const sale = await aceptarOferta(req.user.uid, req.params.id, req.params.offerId);
    await respond(req, res, { sale });
  }),
);

for (const accion of ['rechazar', 'retirar']) {
  router.post(
    `/:id/ofertas/:offerId/${accion}`,
    writeLimiter,
    asyncHandler(async (req, res) => {
      await cerrarOferta(req.user.uid, req.params.id, req.params.offerId, accion);
      await respond(req, res);
    }),
  );
}

export default router;
