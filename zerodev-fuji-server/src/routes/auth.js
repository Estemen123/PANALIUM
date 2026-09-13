import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { auth, db, FieldValue } from '../config/firebase.js';
import { hasWebApiKey, refreshIdToken, sendPasswordReset, signInWithPassword } from '../config/firebaseWeb.js';
import { ROLES, requireAuth, requireRole } from '../middleware/auth.js';
import { ensureWalletSafe } from '../services/walletRegistry.js';
import { HttpError, asyncHandler, validate } from '../middleware/errors.js';

/**
 * Rutas de cuenta que consume el frontend de Panalium (src/features/auth/AuthProvider.tsx):
 *   POST /api/auth/register     { email, password, displayName, phone?, role? } -> { uid, email, role }
 *   GET  /api/auth/me           -> { uid, claims, profile }
 *   POST /api/auth/create-admin (solo admin)
 *
 * Y, sobre la REST de Identity Toolkit (necesita FIREBASE_API_KEY), el equivalente en servidor
 * de lo que el SDK web hace en el cliente:
 *   POST /api/auth/login          { email, password }   -> { idToken, refreshToken, expiresIn, user }
 *   POST /api/auth/refresh        { refreshToken }      -> { idToken, refreshToken, expiresIn }
 *   POST /api/auth/reset-password { email }             -> { ok: true }
 *
 * El frontend muestra `error` como mensaje al usuario, asi que aqui `error` es texto legible
 * y el codigo de maquina va en `code`.
 */
const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta red, intenta mas tarde', code: 'rate_limited' },
});

// Login: limite mas estrecho, es la ruta que se presta a fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos', code: 'rate_limited' },
});

const email = z.string().trim().email('Formato de correo invalido');
const password = z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').max(256);
const displayName = z.string().trim().max(120).optional().default('');
const phone = z.string().trim().max(40).optional().default('');

const registerSchema = z.object({
  email,
  password,
  displayName,
  phone,
  // Desde el cliente solo se aceptan roles registrables. Nunca 'admin'.
  role: z.enum(['buyer', 'wholesaler']).optional().default('buyer'),
});

const createAdminSchema = z.object({ email, password, displayName, phone });
const loginSchema = z.object({ email, password: z.string().min(1, 'La contrasena es obligatoria') });
const refreshSchema = z.object({ refreshToken: z.string().min(1, 'refreshToken es obligatorio') });
const resetSchema = z.object({ email });

function timestampToIso(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function serializeProfile(data) {
  return {
    email: data.email ?? '',
    displayName: data.displayName ?? '',
    phone: data.phone ?? '',
    role: ROLES.includes(data.role) ? data.role : 'buyer',
    avatar: data.avatar ?? undefined,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

/** Traduce errores de Firebase Auth a respuestas con mensaje legible. */
function mapAuthError(err) {
  const code = err?.code ?? '';
  if (code.includes('email-already-exists')) {
    return new HttpError(409, 'El correo ya esta registrado. Inicia sesion o recupera la contrasena.', { code });
  }
  if (code.includes('invalid-email')) return new HttpError(400, 'Formato de correo invalido', { code });
  if (code.includes('invalid-password') || code.includes('weak-password')) {
    return new HttpError(400, 'La contrasena debe tener al menos 6 caracteres', { code });
  }
  if (code.includes('phone-number-already-exists')) {
    return new HttpError(409, 'El telefono ya esta registrado', { code });
  }
  if (code.includes('invalid-phone-number')) return new HttpError(400, 'Telefono invalido', { code });
  return new HttpError(500, 'No se pudo crear el usuario', { code, details: err?.message });
}

async function createUserWithRole({ email, password, displayName, phone }, role) {
  let record;
  try {
    record = await auth.createUser({ email, password, displayName: displayName || undefined });
  } catch (err) {
    throw mapAuthError(err);
  }

  try {
    await auth.setCustomUserClaims(record.uid, { role });
    await db.collection('users').doc(record.uid).set({
      email,
      displayName,
      phone,
      role,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // No dejar una cuenta a medias: si falla el perfil, borramos el usuario de Auth.
    await auth.deleteUser(record.uid).catch(() => {});
    throw new HttpError(500, 'No se pudo guardar el perfil del usuario', { details: err?.message });
  }

  // Cada Abeja nace con su smart account. Si falla, el registro no se cae: se reintenta al entrar.
  const wallet = await ensureWalletSafe(record.uid, 'register');

  return { uid: record.uid, email, role, wallet: wallet?.idwallet ?? null };
}

/** Traduce los codigos de Identity Toolkit a mensajes que el frontend puede mostrar tal cual. */
function mapIdentityError(errorCode) {
  const code = String(errorCode ?? '');
  if (code.startsWith('EMAIL_NOT_FOUND')) return new HttpError(401, 'No existe una cuenta con ese correo', { code });
  if (code.startsWith('INVALID_PASSWORD') || code.startsWith('INVALID_LOGIN_CREDENTIALS')) {
    return new HttpError(401, 'Correo o contrasena incorrectos', { code });
  }
  if (code.startsWith('USER_DISABLED')) return new HttpError(403, 'Cuenta deshabilitada. Contacta al soporte.', { code });
  if (code.startsWith('TOO_MANY_ATTEMPTS')) {
    return new HttpError(429, 'Demasiados intentos fallidos. Intenta mas tarde.', { code });
  }
  if (code.startsWith('TOKEN_EXPIRED') || code.startsWith('INVALID_REFRESH_TOKEN')) {
    return new HttpError(401, 'Sesion expirada, vuelve a iniciar sesion', { code });
  }
  return new HttpError(400, 'No se pudo completar la operacion', { code });
}

/** Bloquea las rutas de Identity Toolkit si no hay FIREBASE_API_KEY configurada. */
function requireWebApiKey(_req, _res, next) {
  if (!hasWebApiKey) {
    return next(
      new HttpError(501, 'Login por servidor no disponible: falta FIREBASE_API_KEY', { code: 'api_key_missing' }),
    );
  }
  next();
}

/** POST /api/auth/register — publico */
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const { role, ...input } = req.body;
    const created = await createUserWithRole(input, role);
    res.status(201).json(created);
  }),
);

/** POST /api/auth/create-admin — solo un admin puede crear otro admin */
router.post(
  '/create-admin',
  requireAuth,
  requireRole('admin'),
  validate(createAdminSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const created = await createUserWithRole(req.body, 'admin');
    res.status(201).json(created);
  }),
);

/**
 * POST /api/auth/login — publico
 * Equivalente en servidor de signInWithEmailAndPassword. Devuelve el ID token listo para
 * mandarlo en `Authorization: Bearer` a cualquier otra ruta, mas el perfil del usuario.
 */
router.post(
  '/login',
  loginLimiter,
  requireWebApiKey,
  validate(loginSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await signInWithPassword(email, password);
    if (!result.ok) throw mapIdentityError(result.errorCode);

    const { idToken, refreshToken, expiresIn, localId } = result.data;
    const snap = await db.collection('users').doc(localId).get();
    const profile = snap.exists ? serializeProfile(snap.data()) : null;

    // Usuarios creados antes de que existiera este registro entran sin wallet: se la creamos aqui.
    const wallet = await ensureWalletSafe(localId, 'login');

    res.json({
      idToken,
      refreshToken,
      expiresIn: Number(expiresIn),
      uid: localId,
      user: { uid: localId, email, role: profile?.role ?? 'buyer', wallet: wallet?.idwallet ?? null },
      profile,
      wallet,
    });
  }),
);

/** POST /api/auth/refresh — canjea el refresh token por un ID token nuevo */
router.post(
  '/refresh',
  requireWebApiKey,
  validate(refreshSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const result = await refreshIdToken(req.body.refreshToken);
    if (!result.ok) throw mapIdentityError(result.errorCode);

    res.json({
      idToken: result.data.id_token,
      refreshToken: result.data.refresh_token,
      expiresIn: Number(result.data.expires_in),
      uid: result.data.user_id,
    });
  }),
);

/**
 * POST /api/auth/reset-password — manda el correo de restablecimiento.
 * Responde 200 aunque el correo no exista, para no revelar que cuentas estan registradas.
 */
router.post(
  '/reset-password',
  loginLimiter,
  requireWebApiKey,
  validate(resetSchema, 'body', { friendly: true }),
  asyncHandler(async (req, res) => {
    const result = await sendPasswordReset(req.body.email);
    if (!result.ok && !String(result.errorCode).startsWith('EMAIL_NOT_FOUND')) {
      throw mapIdentityError(result.errorCode);
    }
    res.json({ ok: true, message: 'Si el correo existe, te enviamos las instrucciones' });
  }),
);

/**
 * GET /api/auth/me
 * Devuelve el perfil de Firestore. Si el documento no existe (usuario creado desde la consola
 * o antes de este backend) lo crea a partir de Firebase Auth para que el frontend nunca reciba null.
 *
 * Es tambien el punto donde se repara la wallet: el frontend inicia sesion con el SDK web y llama
 * aqui para hidratar la sesion, asi que cualquier usuario sin wallet la obtiene al entrar.
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { uid } = req.user;
    const ref = db.collection('users').doc(uid);
    let snap = await ref.get();

    if (!snap.exists) {
      const record = await auth.getUser(uid);
      const role = req.user.role ?? 'buyer';
      await ref.set({
        email: record.email ?? req.user.email ?? '',
        displayName: record.displayName ?? '',
        phone: record.phoneNumber ?? '',
        role,
        createdAt: FieldValue.serverTimestamp(),
      });
      snap = await ref.get();
    }

    const profile = serializeProfile(snap.data() ?? {});

    // Sincroniza el custom claim si el doc tiene rol pero el token no (usuarios creados a mano).
    if (!req.user.role && profile.role) {
      await auth.setCustomUserClaims(uid, { role: profile.role }).catch((err) => {
        console.warn(`[auth] no se pudo sincronizar el claim de rol de ${uid}: ${err?.message}`);
      });
    }

    // Crea la wallet si el usuario todavia no la tiene. Idempotente y no bloquea el login si falla.
    const wallet = await ensureWalletSafe(uid, 'me');

    res.json({
      uid,
      claims: req.user.claims,
      profile: { ...profile, wallet: wallet?.idwallet ?? null },
      wallet,
    });
  }),
);

export default router;
