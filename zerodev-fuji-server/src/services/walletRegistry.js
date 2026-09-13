import { db, FieldValue } from '../config/firebase.js';
import { chain } from '../config/chain.js';
import { isAdminUid } from '../middleware/auth.js';
import { getMasterAddress } from './masterWallet.js';
import { getSmartAccountAddress } from './smartAccount.js';

/**
 * Registro en Firestore de la smart account de cada usuario.
 *
 * Coleccion `wallet`, con el esquema que ya existia en el proyecto:
 *   { idwallet: <direccion 0x...>, createdBy: <uid> }
 * mas metadatos que agregamos nosotros: `chainId`, `createdAt`, `updatedAt`.
 *
 * La direccion es *contrafactual*: se deriva del signer del usuario y existe antes de que el
 * contrato se despliegue. Por eso registrarla no cuesta gas ni requiere una transaccion on-chain;
 * el contrato se despliega solo con la primera UserOp que mande el usuario.
 */
const COLLECTION = 'wallet';

function serializeWallet(id, data) {
  return {
    id,
    idwallet: String(data.idwallet ?? ''),
    createdBy: String(data.createdBy ?? ''),
    chainId: data.chainId ?? chain.id,
    kind: data.kind === 'master' ? 'master' : 'smart',
  };
}

/** Documento de wallet del usuario, o null. Una sola lectura, sin tocar la red. */
export async function findWallet(uid) {
  const snap = await db.collection(COLLECTION).where('createdBy', '==', uid).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return serializeWallet(doc.id, doc.data() ?? {});
}

/**
 * Garantiza que el usuario tenga su smart account registrada en `wallet`.
 * Es idempotente: si ya hay documento con `idwallet` no vuelve a calcular nada.
 * Tambien repara documentos viejos que quedaron con `idwallet` vacio.
 *
 * Devuelve `{ ...wallet, created }`, donde `created` dice si se escribio en esta llamada.
 */
export async function ensureWallet(uid) {
  if (await isAdminUid(uid)) return ensureMasterWallet(uid);

  // 1. Camino rapido: ya registrada y con direccion. Evita el RPC y la transaccion.
  const existing = await findWallet(uid);
  if (existing?.idwallet) return { ...existing, created: false };

  // 2. Derivar la direccion (crea la llave del signer si es la primera vez).
  const address = await getSmartAccountAddress(uid);

  // 3. Escribir. La transaccion vuelve a comprobar por si dos requests entraron a la vez.
  const result = await db.runTransaction(async (tx) => {
    const query = db.collection(COLLECTION).where('createdBy', '==', uid).limit(1);
    const snap = await tx.get(query);

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data() ?? {};
      if (data.idwallet) {
        // Otro request gano la carrera.
        return { ...serializeWallet(doc.id, data), created: false };
      }
      // Documento preexistente con idwallet vacio: lo completamos.
      tx.update(doc.ref, { idwallet: address, chainId: chain.id, updatedAt: FieldValue.serverTimestamp() });
      return { id: doc.id, idwallet: address, createdBy: uid, chainId: chain.id, created: true };
    }

    const ref = db.collection(COLLECTION).doc();
    tx.set(ref, {
      idwallet: address,
      createdBy: uid,
      chainId: chain.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: null,
    });
    return { id: ref.id, idwallet: address, createdBy: uid, chainId: chain.id, created: true };
  });

  return result;
}

/**
 * El admin no tiene smart account: su documento en `wallet` apunta a la wallet master.
 * Si antes se le habia registrado una smart account, la direccion vieja queda en `previousIdwallet`.
 */
async function ensureMasterWallet(uid) {
  const address = getMasterAddress();
  const snap = await db.collection(COLLECTION).where('createdBy', '==', uid).limit(1).get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data() ?? {};
    if (String(data.idwallet).toLowerCase() === address.toLowerCase() && data.kind === 'master') {
      return { ...serializeWallet(doc.id, data), created: false };
    }
    const update = { idwallet: address, kind: 'master', chainId: chain.id, updatedAt: FieldValue.serverTimestamp() };
    if (data.idwallet && String(data.idwallet).toLowerCase() !== address.toLowerCase()) {
      update.previousIdwallet = data.idwallet;
    }
    await doc.ref.update(update);
    return { id: doc.id, idwallet: address, createdBy: uid, chainId: chain.id, kind: 'master', created: true };
  }

  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    idwallet: address,
    kind: 'master',
    createdBy: uid,
    chainId: chain.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: null,
  });
  return { id: ref.id, idwallet: address, createdBy: uid, chainId: chain.id, kind: 'master', created: true };
}

/**
 * Igual que ensureWallet pero no propaga el error.
 *
 * Se usa en registro y login: si ZeroDev o el RPC estan caidos, el usuario debe poder entrar
 * igual. La wallet se reintenta en la siguiente peticion, porque ensureWallet es idempotente.
 */
export async function ensureWalletSafe(uid, context = 'auth') {
  try {
    const wallet = await ensureWallet(uid);
    if (wallet.created) console.log(`[wallet] ${context}: registrada ${wallet.idwallet} para ${uid}`);
    return wallet;
  } catch (err) {
    console.error(`[wallet] ${context}: no se pudo crear la wallet de ${uid}: ${err?.message}`);
    return null;
  }
}
