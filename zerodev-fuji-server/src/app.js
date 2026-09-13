import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { chain } from './config/chain.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import panalesRoutes from './routes/panales.js';
import exakeysRoutes from './routes/exakeys.js';
import configRoutes from './routes/config.js';
import accountRoutes from './routes/account.js';
import txRoutes from './routes/tx.js';
import adminEscrowRoutes from './routes/adminEscrow.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  // BigInt no es serializable por JSON.stringify; lo convertimos a string.
  app.set('json replacer', (_key, value) => (typeof value === 'bigint' ? value.toString() : value));

  const health = (_req, res) =>
    res.json({ ok: true, chain: chain.name, chainId: chain.id, env: env.NODE_ENV });
  app.get('/health', health);
  // Alcanzable a traves del proxy `/api` del frontend (vite.config.ts).
  app.get('/api/health', health);

  // Rutas que consume el frontend de Panalium
  app.use('/api/config', configRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/panales', panalesRoutes);
  app.use('/api/exakeys', exakeysRoutes);
  // Consola del owner de EscrowPanales (solo admin)
  app.use('/api/admin/escrow', adminEscrowRoutes);

  // Smart accounts (ZeroDev / Avalanche Fuji)
  app.use('/api/account', accountRoutes);
  app.use('/api/tx', txRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
