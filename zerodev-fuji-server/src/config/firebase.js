import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { env } from './env.js';

// Raiz del servidor (carpeta que contiene package.json), para resolver rutas relativas del .env.
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readServiceAccountFile() {
  if (!env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  const candidates = [
    path.resolve(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS),
    path.resolve(SERVER_ROOT, env.GOOGLE_APPLICATION_CREDENTIALS),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) {
    console.warn(`[firebase] GOOGLE_APPLICATION_CREDENTIALS no encontrado: ${env.GOOGLE_APPLICATION_CREDENTIALS}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildCredential() {
  if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = JSON.parse(
      Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
    );
    return { credential: admin.credential.cert(json), projectId: json.project_id };
  }
  const serviceAccount = readServiceAccountFile();
  if (serviceAccount) {
    return { credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id };
  }
  // Credenciales por defecto del entorno (Cloud Run, GCE, gcloud auth application-default, etc.)
  return { credential: admin.credential.applicationDefault(), projectId: undefined };
}

if (!admin.apps.length) {
  const { credential, projectId } = buildCredential();
  const resolvedProjectId = env.FIREBASE_PROJECT_ID || projectId;
  admin.initializeApp({
    credential,
    projectId: resolvedProjectId,
    storageBucket:
      env.FIREBASE_STORAGE_BUCKET || (resolvedProjectId ? `${resolvedProjectId}.appspot.com` : undefined),
  });
  console.log(`[firebase] proyecto: ${resolvedProjectId ?? '(por defecto)'}`);
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
