// Crea la smart account de los usuarios que todavia no tienen wallet registrada.
//
// Uso: node scripts/backfillWallets.mjs --dry-run   (solo informa, no escribe)
//      node scripts/backfillWallets.mjs             (crea las que falten)
//
// Es seguro repetirlo: ensureWallet es idempotente y no toca a quien ya tiene idwallet.
// Tampoco cuesta gas: la direccion es contrafactual y el contrato se despliega con la primera UserOp.
import admin, { auth } from '../src/config/firebase.js';
import { ensureWallet, findWallet } from '../src/services/walletRegistry.js';

const dryRun = process.argv.includes('--dry-run');

/** Recorre todos los usuarios de Auth paginando de 1000 en 1000. */
async function* allUsers() {
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    yield* page.users;
    pageToken = page.pageToken;
  } while (pageToken);
}

const stats = { total: 0, yaTenian: 0, creadas: 0, reparadas: 0, fallidas: 0 };

for await (const user of allUsers()) {
  stats.total += 1;
  const label = user.email ?? user.uid;

  const existing = await findWallet(user.uid);
  if (existing?.idwallet) {
    stats.yaTenian += 1;
    continue;
  }

  if (dryRun) {
    console.log(`${existing ? 'REPARARIA' : 'CREARIA'}  ${label} (${user.uid})`);
    if (existing) stats.reparadas += 1;
    else stats.creadas += 1;
    continue;
  }

  try {
    const wallet = await ensureWallet(user.uid);
    if (existing) stats.reparadas += 1;
    else stats.creadas += 1;
    console.log(`${existing ? 'reparada ' : 'creada   '} ${label} -> ${wallet.idwallet}`);
  } catch (err) {
    stats.fallidas += 1;
    console.error(`fallo    ${label}: ${err?.message}`);
  }
}

console.log('\nResumen%s:', dryRun ? ' (simulacion, no se escribio nada)' : '');
console.log(`  usuarios revisados: ${stats.total}`);
console.log(`  ya tenian wallet:   ${stats.yaTenian}`);
console.log(`  wallets creadas:    ${stats.creadas}`);
console.log(`  docs reparados:     ${stats.reparadas}  (existian con idwallet vacio)`);
if (stats.fallidas) console.log(`  fallidas:           ${stats.fallidas}`);

await admin.app().delete();
process.exit(stats.fallidas > 0 ? 1 : 0);
