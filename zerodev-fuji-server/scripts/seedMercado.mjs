// Siembra datos de prueba del Mercado de Abejas en Firestore: Hexakeys (exakeys), publicaciones,
// ofertas y una venta. Todo queda con `mock: true` y se puede borrar sin tocar datos reales.
// Uso: node scripts/seedMercado.mjs          (limpia los mocks anteriores y vuelve a sembrar)
//      node scripts/seedMercado.mjs --clean  (solo borra los mocks)
import admin, { auth, db, FieldValue } from '../src/config/firebase.js';
import { env } from '../src/config/env.js';
import { comprar, ofertar, publicar } from '../src/services/mercado.js';
import { findWallet } from '../src/services/walletRegistry.js';

const IMG = (id) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format`;

// tokenIds altos para no chocar con el contador real counters/exakeys.
const TOKENS = [
  { tokenId: 9001, productName: 'Auriculares Bluetooth TWS', photoUrl: IMG('photo-1590658268037-6bf12165a8df'), unitPrice: 11.2 },
  { tokenId: 9002, productName: 'Aceite de Oliva Extra Virgen 1L', photoUrl: IMG('photo-1474979266404-7eaacbcd87c5'), unitPrice: 4.9 },
  { tokenId: 9003, productName: 'Cafe molido de altura 500 g', photoUrl: IMG('photo-1559056199-641a0ac8b55e'), unitPrice: 6.4 },
];

// Usuarios de prueba existentes (por correo). Si alguno no existe se omite.
const USERS = {
  A: 'josuebrandon99@gmail.com',
  B: 'jos@gmail.com',
  C: 'sthaicy08@gmail.com',
  D: 'ui.test+1@example.com',
};

// Unidades de cada token por usuario.
const HOLDINGS = [
  { user: 'A', tokenId: 9001, units: 6 },
  { user: 'A', tokenId: 9002, units: 10 },
  { user: 'B', tokenId: 9001, units: 4 },
  { user: 'B', tokenId: 9003, units: 8 },
  { user: 'C', tokenId: 9001, units: 3 },
  { user: 'C', tokenId: 9003, units: 6 },
  { user: 'D', tokenId: 9002, units: 5 },
];

async function deleteMocks() {
  let total = 0;
  for (const name of ['mercado_ventas', 'mercado_ofertas', 'mercado', 'exakeys']) {
    const snap = await db.collection(name).where('mock', '==', true).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
    console.log(`  ${name}: ${snap.size} mocks borrados`);
    total += snap.size;
  }
  return total;
}

console.log('Limpiando mocks anteriores...');
await deleteMocks();

if (!process.argv.includes('--clean')) {
  const users = {};
  for (const [key, email] of Object.entries(USERS)) {
    const record = await auth.getUserByEmail(email).catch(() => null);
    if (!record) {
      console.warn(`  ${key}: ${email} no existe, se omite`);
      continue;
    }
    const profile = (await db.collection('users').doc(record.uid).get()).data() ?? {};
    const wallet = await findWallet(record.uid).catch(() => null);
    users[key] = { uid: record.uid, name: profile.displayName || email, wallet: wallet?.idwallet ?? '', email };
  }

  console.log('Sembrando Hexakeys...');
  const serials = {};
  const batch = db.batch();
  for (const h of HOLDINGS) {
    const owner = users[h.user];
    if (!owner) continue;
    const token = TOKENS.find((t) => t.tokenId === h.tokenId);
    for (let i = 0; i < h.units; i++) {
      serials[h.tokenId] = (serials[h.tokenId] ?? 0) + 1;
      const serial = serials[h.tokenId];
      batch.set(db.collection('exakeys').doc(`${h.tokenId}-${serial}`), {
        tokenId: h.tokenId,
        serial,
        panalId: `mock-panal-${h.tokenId}`,
        productName: token.productName,
        photoUrl: token.photoUrl,
        unitPrice: token.unitPrice,
        ownerUid: owner.uid,
        ownerName: owner.name,
        ownerWallet: owner.wallet,
        custodian: env.WALLET_MASTER ?? '',
        contractAddress: env.CONTRATO_HSK ?? '',
        chainId: 133,
        mintTransactionHash: null,
        explorerUrl: null,
        status: 'custodia',
        mock: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    console.log(`  ${owner.email}: ${h.units} x token ${h.tokenId}`);
  }
  await batch.commit();

  // Publicaciones, ofertas y una venta con el mismo servicio que usa la API.
  const has = (...keys) => keys.every((k) => users[k]);
  const listings = {};
  if (has('B')) listings.B = await publicar(users.B.uid, { tokenId: 9001, amount: 3, askPrice: 12.5 });
  if (has('C')) listings.C = await publicar(users.C.uid, { tokenId: 9003, amount: 4, askPrice: 7.2 });
  if (has('D')) listings.D = await publicar(users.D.uid, { tokenId: 9002, amount: 3, askPrice: 5.5 });
  if (has('A')) listings.A = await publicar(users.A.uid, { tokenId: 9002, amount: 4, askPrice: 5.2 });
  console.log('Publicaciones:', listings);

  if (has('A', 'C')) await ofertar(users.C.uid, listings.A, { amount: 2, price: 4.8 });
  if (has('A', 'D')) await ofertar(users.D.uid, listings.A, { amount: 4, price: 5 });
  if (has('A', 'B')) await ofertar(users.A.uid, listings.B, { amount: 1, price: 11.9 });
  if (has('B', 'C')) await ofertar(users.B.uid, listings.D ?? listings.C, { amount: 2, price: 5.1 });
  if (has('A', 'C')) console.log('Venta de prueba:', await comprar(users.A.uid, listings.C, 1));
  console.log('Listo.');
}

await admin.app().delete();
process.exit(0);
