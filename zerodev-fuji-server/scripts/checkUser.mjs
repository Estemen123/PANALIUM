// Muestra el usuario de Auth, sus custom claims y su doc users/{uid}.
// Uso: node scripts/checkUser.mjs <uid|email>
import admin, { auth, db } from '../src/config/firebase.js';

const key = process.argv[2];
if (!key) {
  console.error('Uso: node scripts/checkUser.mjs <uid|email>');
  process.exit(1);
}

const user = key.includes('@') ? await auth.getUserByEmail(key) : await auth.getUser(key);
const doc = await db.collection('users').doc(user.uid).get();

console.log('Auth:', { uid: user.uid, email: user.email, displayName: user.displayName, disabled: user.disabled });
console.log('Claims:', user.customClaims ?? {});
console.log('Doc users/' + user.uid + ':', doc.exists ? doc.data() : '(no existe)');
await admin.app().delete();
