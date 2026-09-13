// Crea (o actualiza) un usuario administrador: Firebase Auth + claim role=admin + users/{uid}.
// Su documento en `wallet` apunta a la wallet master (WALLET_MASTER), no a una smart account.
// Uso: node scripts/createAdmin.mjs <email> [password] [displayName]
// Sin password genera una aleatoria y la imprime. Si el usuario ya existe, le cambia la contrasena.
import { randomBytes } from 'node:crypto';
import admin, { auth, db, FieldValue } from '../src/config/firebase.js';
import { ensureWallet } from '../src/services/walletRegistry.js';

const [email, passwordArg, displayName = 'Guardian de la colmena'] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Uso: node scripts/createAdmin.mjs <email> [password] [displayName]');
  process.exit(1);
}
const password = passwordArg ?? `Pnl-${randomBytes(9).toString('base64url')}`;

let user;
try {
  user = await auth.getUserByEmail(email);
  user = await auth.updateUser(user.uid, { password, displayName, emailVerified: true });
  console.log(`Usuario existente ${user.uid}: contrasena actualizada`);
} catch (err) {
  if (err?.code !== 'auth/user-not-found') throw err;
  user = await auth.createUser({ email, password, displayName, emailVerified: true });
  console.log(`Usuario creado ${user.uid}`);
}

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: 'admin' });
await db
  .collection('users')
  .doc(user.uid)
  .set(
    { email, displayName, phone: '', role: 'admin', updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
const ref = db.collection('users').doc(user.uid);
if (!(await ref.get()).data()?.createdAt) await ref.update({ createdAt: FieldValue.serverTimestamp() });

const wallet = await ensureWallet(user.uid).catch((err) => {
  console.warn(`No se pudo crear la wallet ahora (se crea al iniciar sesion): ${err?.message}`);
  return null;
});

console.log('\nAdministrador listo');
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
console.log(`  uid:      ${user.uid}`);
console.log(`  wallet:   ${wallet?.idwallet ?? '(pendiente)'} (${wallet?.kind ?? '?'})`);
await admin.app().delete();
process.exit(0);
