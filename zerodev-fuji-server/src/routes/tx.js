import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/errors.js';
import { callContract, getUserOperationStatus, sendBatch, sendErc20, sendNative } from '../services/wallet.js';

const router = Router();

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Direccion EVM invalida');
const hex = z.string().regex(/^0x[a-fA-F0-9]*$/, 'Hex invalido');
const amount = z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Monto debe ser > 0');

/**
 * Rate limit por usuario. Con paymaster patrocinado el gas lo pagas tu,
 * asi que limitar el envio de UserOps es una proteccion de costo, no solo de abuso.
 */
const txLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: { error: 'rate_limited', message: 'Demasiadas operaciones, intenta en un minuto' },
});

router.use(requireAuth);

/** POST /api/tx/native — transferir AVAX */
router.post(
  '/native',
  txLimiter,
  validate(z.object({ to: address, amountAvax: amount, waitForReceipt: z.boolean().default(true) })),
  asyncHandler(async (req, res) => {
    res.json(await sendNative(req.user.uid, req.body));
  }),
);

/** POST /api/tx/erc20 — transferir un token */
router.post(
  '/erc20',
  txLimiter,
  validate(z.object({ token: address, to: address, amount, waitForReceipt: z.boolean().default(true) })),
  asyncHandler(async (req, res) => {
    res.json(await sendErc20(req.user.uid, req.body));
  }),
);

/** POST /api/tx/contract — llamada arbitraria con ABI */
router.post(
  '/contract',
  txLimiter,
  validate(
    z.object({
      address,
      abi: z.array(z.any()).min(1),
      functionName: z.string().min(1),
      args: z.array(z.any()).default([]),
      value: z.string().default('0'),
      waitForReceipt: z.boolean().default(true),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await callContract(req.user.uid, req.body));
  }),
);

/** POST /api/tx/batch — varias calls en una sola UserOp */
router.post(
  '/batch',
  txLimiter,
  validate(
    z.object({
      calls: z
        .array(
          z.object({
            to: address,
            value: z.string().default('0'),
            data: hex.optional(),
            abi: z.array(z.any()).optional(),
            functionName: z.string().optional(),
            args: z.array(z.any()).optional(),
          }),
        )
        .min(1)
        .max(20),
      waitForReceipt: z.boolean().default(true),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await sendBatch(req.user.uid, req.body));
  }),
);

/** GET /api/tx/status/:userOpHash */
router.get(
  '/status/:userOpHash',
  validate(z.object({ userOpHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) }), 'params'),
  asyncHandler(async (req, res) => {
    res.json(await getUserOperationStatus(req.user.uid, req.params.userOpHash));
  }),
);

export default router;
