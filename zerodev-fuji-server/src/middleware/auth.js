import { auth, db } from '../config/firebase.js';

export const ROLES = ['buyer', 'wholesaler', 'admin'];

/**
 * Verifica el ID token de Firebase que el cliente manda en `Authorization: Bearer <idToken>`.
 * checkRevoked=true consulta si la sesion fue revocada (logout forzado, cuenta deshabilitada).
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing_token', message: 'Falta el header Authorization: Bearer <idToken>' });
  }

  try {
    const decoded = await auth.verifyIdToken(token, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      // Rol del custom claim si existe; requireRole lo completa desde Firestore si falta.
      role: ROLES.includes(decoded.role) ? decoded.role : undefined,
      claims: decoded,
    };
    next();
  } catch (err) {
    const code = err?.code ?? '';
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Token de Firebase invalido o expirado',
      code,
    });
  }
}

/**
 * Resuelve el rol del usuario: custom claim `role` -> documento users/{uid}.role -> 'buyer'.
 * Los usuarios registrados por /api/auth/register llevan el claim; los creados a mano solo el doc.
 */
export async function resolveRole(user) {
  if (user.role) return user.role;
  const snap = await db.collection('users').doc(user.uid).get();
  const role = snap.exists ? snap.data()?.role : undefined;
  return ROLES.includes(role) ? role : 'buyer';
}

/** Exige uno de los roles indicados. Debe ir despues de requireAuth. */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado', code: 'unauthenticated' });
      }
      req.user.role = await resolveRole(req.user);
      if (roles.includes(req.user.role)) return next();
      return res.status(403).json({
        error: 'No tienes permiso para esta operacion',
        code: 'forbidden',
        details: `Requiere rol ${roles.join(' o ')}, tu rol es ${req.user.role}`,
      });
    } catch (err) {
      next(err);
    }
  };
}

/** Opcional: exigir email verificado antes de permitir operaciones on-chain. */
export function requireVerifiedEmail(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ error: 'email_not_verified', message: 'Verifica tu correo para operar' });
  }
  next();
}
