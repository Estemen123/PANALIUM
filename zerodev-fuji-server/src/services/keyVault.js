import crypto from 'node:crypto';
import { generatePrivateKey } from 'viem/accounts';
import { db, FieldValue } from '../config/firebase.js';
import { env } from '../config/env.js';

const MASTER_KEY = Buffer.from(env.KEY_ENCRYPTION_MASTER_KEY, 'hex');
const COLLECTION = 'wallet_keys';
const ALGO = 'aes-256-gcm';

/**
 * Deriva una clave por usuario a partir de la master key (HKDF).
 * Asi un mismo ciphertext no se puede reusar en otro uid.
 */
function deriveKey(uid) {
  return Buffer.from(
    crypto.hkdfSync('sha256', MASTER_KEY, Buffer.from(uid), Buffer.from('zerodev-signer'), 32),
  );
}

function encrypt(uid, plaintext) {
  const key = deriveKey(uid);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ct.toString('base64'),
  };
}

function decrypt(uid, payload) {
  const key = deriveKey(uid);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Devuelve la private key del signer del usuario. La crea la primera vez.
 * Se usa una transaccion para que dos requests simultaneos no generen dos llaves distintas.
 */
export async function getOrCreateSignerKey(uid) {
  const ref = db.collection(COLLECTION).doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (snap.exists) {
      const doc = snap.data();
      return { privateKey: decrypt(uid, doc.encrypted), createdAt: doc.createdAt, isNew: false };
    }

    const privateKey = generatePrivateKey();
    tx.set(ref, {
      uid,
      encrypted: encrypt(uid, privateKey),
      createdAt: FieldValue.serverTimestamp(),
    });

    return { privateKey, isNew: true };
  });
}

export async function hasSignerKey(uid) {
  const snap = await db.collection(COLLECTION).doc(uid).get();
  return snap.exists;
}
