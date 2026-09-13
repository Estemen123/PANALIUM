import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default(''),

  ZERODEV_PROJECT_ID: z.string().min(1),
  ZERODEV_RPC: z.string().url().optional(),

  CHAIN_ID: z.coerce.number().default(43113),
  AVALANCHE_RPC_URL: z.string().url().default('https://api.avax-test.network/ext/bc/C/rpc'),

  // Token ERC-20 que la app usa como moneda (USDC). Si se deja vacio, el fondeo desde una
  // wallet externa se hace en AVAX nativo, que es lo unico que existe por defecto en Fuji.
  USDC_TOKEN_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'USDC_TOKEN_ADDRESS debe ser una direccion EVM')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  USDC_TOKEN_DECIMALS: z.coerce.number().int().min(0).max(36).default(6),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  // Ruta al service account JSON (absoluta o relativa a la raiz del servidor).
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  // Bucket de Firebase Storage para las fotos de productos. Sin bucket la foto se guarda inline (data URI).
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // ---------- Config publica del SDK web (snippet de la consola de Firebase) ----------
  // No son secretos: viajan en el bundle de cualquier cliente. La apiKey habilita la REST
  // de Identity Toolkit, que es lo que usa /api/auth/login para emitir ID tokens.
  FIREBASE_API_KEY: z.string().optional(),
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_MEASUREMENT_ID: z.string().optional(),

  KEY_ENCRYPTION_MASTER_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'KEY_ENCRYPTION_MASTER_KEY debe ser 32 bytes en hex (64 caracteres)'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuracion invalida:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  // Si no se define ZERODEV_RPC lo construimos con el project id + chain id.
  ZERODEV_RPC:
    raw.ZERODEV_RPC ??
    `https://rpc.zerodev.app/api/v3/${raw.ZERODEV_PROJECT_ID}/chain/${raw.CHAIN_ID}`,
  corsOrigins: raw.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  isProd: raw.NODE_ENV === 'production',
};
