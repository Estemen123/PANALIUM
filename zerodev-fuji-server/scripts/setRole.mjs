// Asigna el rol a un usuario: custom claim + campo role en users/{uid}.
// Uso: node scripts/setRole.mjs <uid|email> <buyer|wholesaler|admin>
// El usuario debe volver a iniciar sesion (o refrescar el token) para que el claim aplique.
import admin, { auth, db, FieldValue } from '../src/config/firebase.js';
import { ROLES } from '../src/middleware/auth.js';

const [key, role] = process.argv.slice(2);
if (!key || !ROLES.includes(role)) {
  console.error(`Uso: node scripts/setRole.mjs <uid|email> <${ROLES.join('|')}>`);
  process.exit(1);
}

const user = key.includes('@') ? await auth.getUserByEmail(key) : await auth.getUser(key);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });
const ref = db.collection('users').doc(user.uid);
const snap = await ref.get();
if (snap.exists) {
  await ref.update({ role, updatedAt: FieldValue.serverTimestamp() });
} else {
  await ref.set({
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    phone: user.phoneNumber ?? '',
    role,
    createdAt: FieldValue.serverTimestamp(),
  });
}
console.log(`Rol ${role} asignado a ${user.email ?? user.uid} (${user.uid})`);
await admin.app().delete();
