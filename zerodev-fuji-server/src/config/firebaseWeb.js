import { env } from './env.js';

/**
 * Configuracion *publica* del SDK web de Firebase (la del snippet de la consola).
 * No es un secreto: viaja en el bundle de cualquier cliente. La usamos para dos cosas:
 *
 *   1. Servirla en `GET /api/config/firebase` para que un cliente la pida en runtime
 *      en vez de tenerla hardcodeada.
 *   2. `apiKey` habilita la REST de Identity Toolkit, que es lo unico que permite
 *      cambiar email + password por un ID token. El Admin SDK no valida contrasenas.
 */
export const firebaseWebConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID,
};

/** true si hay apiKey, o sea si /api/auth/login y /api/auth/refresh pueden operar. */
export const hasWebApiKey = Boolean(env.FIREBASE_API_KEY);

const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1';

/**
 * Llama a la REST de Google Identity y normaliza el error.
 * Devuelve `{ ok, data, errorCode }`; el caller decide el mensaje y el status.
 */
async function callIdentityApi(url, body) {
  const response = await fetch(`${url}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, errorCode: data?.error?.message ?? 'UNKNOWN_ERROR', data };
  }
  return { ok: true, data };
}

/** Cambia email + password por un ID token (lo que hace signInWithEmailAndPassword en el cliente). */
export function signInWithPassword(email, password) {
  return callIdentityApi(`${IDENTITY_TOOLKIT}/accounts:signInWithPassword`, {
    email,
    password,
    returnSecureToken: true,
  });
}

/** Renueva el ID token a partir del refresh token. */
export function refreshIdToken(refreshToken) {
  return callIdentityApi(`${SECURE_TOKEN}/token`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

/** Manda el correo de restablecimiento de contrasena. */
export function sendPasswordReset(email) {
  return callIdentityApi(`${IDENTITY_TOOLKIT}/accounts:sendOobCode`, {
    requestType: 'PASSWORD_RESET',
    email,
  });
}
