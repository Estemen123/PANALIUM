import { db, FieldValue } from '../config/firebase.js';
import { HttpError } from '../middleware/errors.js';
import { findWallet } from './walletRegistry.js';

/**
 * Mercado de Abejas: reventa de Hexakeys (ExaKeys) entre usuarios. Todo es web2: on-chain las
 * ExaKeys siguen en custodia de la wallet master y aqui solo cambia el dueno en Firestore.
 *
 * Colecciones:
 *   exakeys/{tokenId}-{serial}   `listingId` mientras la unidad esta publicada; al venderse cambia `ownerUid`
 *   mercado/{id}                 publicacion: vendedor, token, celdas disponibles, precio por celda
 *   mercado_ofertas/{id}         oferta de otra Abeja por una publicacion (celdas + precio por celda)
 *   mercado_ventas/{id}          historial de traspasos (compra directa u oferta aceptada)
 *
 * Estados: publicacion activa | vendida | cancelada; oferta pendiente | aceptada | rechazada | retirada | cerrada.
 */
const LISTINGS = 'mercado';
const OFFERS = 'mercado_ofertas';
const SALES = 'mercado_ventas';

const listingRef = (id) => db.collection(LISTINGS).doc(id);
const round6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

function timestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

async function perfil(uid) {
  const [snap, wallet] = await Promise.all([db.collection('users').doc(uid).get(), findWallet(uid).catch(() => null)]);
  const data = snap.data() ?? {};
  return { uid, name: String(data.displayName || data.email || 'Abeja'), wallet: wallet?.idwallet ?? '' };
}

function serializeOffer(id, d) {
  return {
    id,
    listingId: String(d.listingId ?? ''),
    buyerUid: String(d.buyerUid ?? ''),
    buyerName: String(d.buyerName ?? ''),
    amount: Number(d.amount ?? 0),
    price: Number(d.price ?? 0),
    status: String(d.status ?? 'pendiente'),
    createdAt: timestampToIso(d.createdAt),
  };
}

function serializeListing(id, d) {
  return {
    id,
    sellerUid: String(d.sellerUid ?? ''),
    sellerName: String(d.sellerName ?? ''),
    tokenId: Number(d.tokenId ?? 0),
    panalId: String(d.panalId ?? ''),
    productName: String(d.productName ?? ''),
    photoUrl: String(d.photoUrl ?? ''),
    unitPrice: d.unitPrice == null ? null : Number(d.unitPrice),
    initialAmount: Number(d.initialAmount ?? 0),
    amount: Number(d.amount ?? 0),
    askPrice: Number(d.askPrice ?? 0),
    currency: String(d.currency ?? 'USDC'),
    status: String(d.status ?? 'activa'),
    mock: Boolean(d.mock),
    createdAt: timestampToIso(d.createdAt),
  };
}

function serializeSale(id, d) {
  return {
    id,
    listingId: String(d.listingId ?? ''),
    tokenId: Number(d.tokenId ?? 0),
    productName: String(d.productName ?? ''),
    sellerName: String(d.sellerName ?? ''),
    buyerName: String(d.buyerName ?? ''),
    units: Number(d.units ?? 0),
    price: Number(d.price ?? 0),
    total: Number(d.total ?? 0),
    via: String(d.via ?? 'compra'),
    createdAt: timestampToIso(d.createdAt),
  };
}

/* ── Lectura ──────────────────────────────────────────────────────────── */

/**
 * Publicaciones activas con sus ofertas pendientes. El vendedor ve todas las ofertas de lo suyo;
 * los demas ven solo las propias, mas el conteo y la mejor oferta.
 */
export async function listarMercado(uid) {
  const [listings, offers, sales] = await Promise.all([
    db.collection(LISTINGS).where('status', '==', 'activa').get(),
    db.collection(OFFERS).where('status', '==', 'pendiente').get(),
    db.collection(SALES).orderBy('createdAt', 'desc').limit(12).get(),
  ]);

  const byListing = new Map();
  for (const doc of offers.docs) {
    const offer = serializeOffer(doc.id, doc.data());
    if (!byListing.has(offer.listingId)) byListing.set(offer.listingId, []);
    byListing.get(offer.listingId).push(offer);
  }

  const items = listings.docs
    .map((doc) => {
      const listing = serializeListing(doc.id, doc.data());
      const all = (byListing.get(listing.id) ?? []).sort((a, b) => b.price - a.price);
      const own = listing.sellerUid === uid;
      return {
        ...listing,
        offersCount: all.length,
        bestOffer: all[0]?.price ?? null,
        offers: own ? all : all.filter((o) => o.buyerUid === uid),
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return { items, sales: sales.docs.map((doc) => serializeSale(doc.id, doc.data())) };
}

/* ── Publicar y retirar ───────────────────────────────────────────────── */

export async function publicar(uid, { tokenId, amount, askPrice }) {
  const seller = await perfil(uid);
  const ref = db.collection(LISTINGS).doc();

  await db.runTransaction(async (tx) => {
    const owned = await tx.get(db.collection('exakeys').where('ownerUid', '==', uid));
    const libres = owned.docs
      .filter((d) => Number(d.data().tokenId) === Number(tokenId) && !d.data().listingId && d.data().status !== 'reclamada')
      .sort((a, b) => Number(a.data().serial) - Number(b.data().serial));
    if (libres.length === 0) {
      throw new HttpError(400, 'No tienes Hexakeys libres de ese token', { code: 'sin_hexakeys' });
    }
    if (libres.length < amount) {
      throw new HttpError(400, `Solo tienes ${libres.length} celdas libres de esta Hexakey`, { code: 'sin_hexakeys' });
    }

    const elegidas = libres.slice(0, amount);
    const base = elegidas[0].data();
    tx.set(ref, {
      sellerUid: uid,
      sellerName: seller.name,
      tokenId: Number(tokenId),
      panalId: String(base.panalId ?? ''),
      productName: String(base.productName ?? ''),
      photoUrl: String(base.photoUrl ?? ''),
      unitPrice: base.unitPrice ?? null,
      exakeyIds: elegidas.map((d) => d.id),
      initialAmount: amount,
      amount,
      askPrice: round6(askPrice),
      currency: 'USDC',
      status: 'activa',
      mock: elegidas.some((d) => d.data().mock === true),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const d of elegidas) tx.update(d.ref, { listingId: ref.id, updatedAt: FieldValue.serverTimestamp() });
  });

  return ref.id;
}

/** Lee la publicacion dentro de la transaccion y valida que siga activa. */
async function leerActiva(tx, listingId) {
  const snap = await tx.get(listingRef(listingId));
  if (!snap.exists) throw new HttpError(404, 'Publicacion no encontrada', { code: 'not_found' });
  const data = snap.data();
  if (data.status !== 'activa') throw new HttpError(400, 'Esta publicacion ya no esta activa', { code: 'publicacion_cerrada' });
  return data;
}

const pendientesDe = (tx, listingId) =>
  tx.get(db.collection(OFFERS).where('listingId', '==', listingId)).then((s) =>
    s.docs.filter((d) => d.data().status === 'pendiente'),
  );

export async function retirar(uid, listingId) {
  await db.runTransaction(async (tx) => {
    const listing = await leerActiva(tx, listingId);
    if (listing.sellerUid !== uid) throw new HttpError(403, 'Solo el vendedor puede retirar la publicacion', { code: 'forbidden' });
    const refs = (listing.exakeyIds ?? []).map((id) => db.collection('exakeys').doc(id));
    const exakeys = refs.length ? await tx.getAll(...refs) : [];
    const ofertas = await pendientesDe(tx, listingId);

    for (const d of exakeys) {
      if (d.exists && d.data().listingId === listingId) tx.update(d.ref, { listingId: FieldValue.delete() });
    }
    for (const o of ofertas) tx.update(o.ref, { status: 'cerrada', updatedAt: FieldValue.serverTimestamp() });
    tx.update(listingRef(listingId), { status: 'cancelada', exakeyIds: [], updatedAt: FieldValue.serverTimestamp() });
  });
}

/* ── Traspaso ─────────────────────────────────────────────────────────── */

/**
 * Pasa `units` Hexakeys de la publicacion al comprador. Se llama dentro de una transaccion con todas
 * las lecturas ya hechas (Firestore exige leer antes de escribir).
 */
function traspasar(tx, { listingId, listing, exakeys, pendientes, buyer, units, price, via, offerId }) {
  const vigentes = exakeys.filter(
    (d) => d.exists && d.data().listingId === listingId && d.data().ownerUid === listing.sellerUid,
  );
  if (vigentes.length < units) {
    throw new HttpError(409, `La publicacion solo tiene ${vigentes.length} celdas disponibles`, { code: 'sin_disponibles' });
  }
  const movidas = vigentes.slice(0, units);
  const now = FieldValue.serverTimestamp();

  for (const d of movidas) {
    tx.update(d.ref, {
      ownerUid: buyer.uid,
      ownerName: buyer.name,
      ownerWallet: buyer.wallet,
      previousOwnerUid: listing.sellerUid,
      listingId: FieldValue.delete(),
      lastTransferAt: now,
    });
  }

  const movidasIds = new Set(movidas.map((d) => d.id));
  const restantes = (listing.exakeyIds ?? []).filter((id) => !movidasIds.has(id));
  const amount = Number(listing.amount) - units;
  tx.update(listingRef(listingId), {
    amount,
    exakeyIds: restantes,
    status: amount <= 0 ? 'vendida' : 'activa',
    updatedAt: now,
  });

  // Agotada: las demas ofertas pendientes ya no se pueden cumplir.
  if (amount <= 0) {
    for (const o of pendientes) {
      if (o.id !== offerId) tx.update(o.ref, { status: 'cerrada', updatedAt: now });
    }
  }

  tx.set(db.collection(SALES).doc(), {
    listingId,
    offerId: offerId ?? null,
    tokenId: Number(listing.tokenId),
    panalId: listing.panalId ?? '',
    productName: listing.productName ?? '',
    exakeyIds: [...movidasIds],
    sellerUid: listing.sellerUid,
    sellerName: listing.sellerName ?? '',
    buyerUid: buyer.uid,
    buyerName: buyer.name,
    units,
    price: round6(price),
    total: round6(price * units),
    currency: 'USDC',
    via,
    mock: Boolean(listing.mock),
    createdAt: now,
  });

  return { units, price: round6(price), total: round6(price * units), remaining: Math.max(amount, 0) };
}

async function leerExakeys(tx, listing) {
  const refs = (listing.exakeyIds ?? []).map((id) => db.collection('exakeys').doc(id));
  return refs.length ? tx.getAll(...refs) : [];
}

/** Compra directa al precio publicado. */
export async function comprar(uid, listingId, units) {
  const buyer = await perfil(uid);
  return db.runTransaction(async (tx) => {
    const listing = await leerActiva(tx, listingId);
    if (listing.sellerUid === uid) throw new HttpError(400, 'No puedes comprar tu propia publicacion', { code: 'propia' });
    if (units > Number(listing.amount)) {
      throw new HttpError(400, `Solo quedan ${listing.amount} celdas en esta publicacion`, { code: 'sin_disponibles' });
    }
    const exakeys = await leerExakeys(tx, listing);
    const pendientes = await pendientesDe(tx, listingId);
    return traspasar(tx, { listingId, listing, exakeys, pendientes, buyer, units, price: listing.askPrice, via: 'compra' });
  });
}

/* ── Ofertas ──────────────────────────────────────────────────────────── */

/** Crea la oferta, o actualiza la pendiente que ya tenga esa Abeja en la publicacion. */
export async function ofertar(uid, listingId, { amount, price }) {
  const buyer = await perfil(uid);
  return db.runTransaction(async (tx) => {
    const listing = await leerActiva(tx, listingId);
    if (listing.sellerUid === uid) throw new HttpError(400, 'No puedes ofertar por tu propia publicacion', { code: 'propia' });
    if (amount > Number(listing.amount)) {
      throw new HttpError(400, `Solo quedan ${listing.amount} celdas en esta publicacion`, { code: 'sin_disponibles' });
    }
    const pendientes = await pendientesDe(tx, listingId);
    const previa = pendientes.find((o) => o.data().buyerUid === uid);
    const data = { amount, price: round6(price), buyerName: buyer.name, updatedAt: FieldValue.serverTimestamp() };
    if (previa) {
      tx.update(previa.ref, data);
      return previa.id;
    }
    const ref = db.collection(OFFERS).doc();
    tx.set(ref, {
      ...data,
      listingId,
      tokenId: Number(listing.tokenId),
      sellerUid: listing.sellerUid,
      buyerUid: uid,
      status: 'pendiente',
      mock: Boolean(listing.mock),
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  });
}

async function leerOferta(tx, listingId, offerId) {
  const snap = await tx.get(db.collection(OFFERS).doc(offerId));
  if (!snap.exists || snap.data().listingId !== listingId) {
    throw new HttpError(404, 'Oferta no encontrada', { code: 'not_found' });
  }
  if (snap.data().status !== 'pendiente') throw new HttpError(400, 'La oferta ya no esta pendiente', { code: 'oferta_cerrada' });
  return snap;
}

/** El vendedor acepta: la Hexakey pasa a quien oferto, al precio de la oferta. */
export async function aceptarOferta(uid, listingId, offerId) {
  return db.runTransaction(async (tx) => {
    const listing = await leerActiva(tx, listingId);
    if (listing.sellerUid !== uid) throw new HttpError(403, 'Solo el vendedor puede aceptar ofertas', { code: 'forbidden' });
    const offer = await leerOferta(tx, listingId, offerId);
    const o = offer.data();
    if (Number(o.amount) > Number(listing.amount)) {
      throw new HttpError(400, `La oferta pide ${o.amount} celdas y solo quedan ${listing.amount}`, { code: 'sin_disponibles' });
    }
    const exakeys = await leerExakeys(tx, listing);
    const pendientes = await pendientesDe(tx, listingId);
    const buyerWallet = await findWallet(o.buyerUid).catch(() => null);
    const buyer = { uid: o.buyerUid, name: o.buyerName ?? 'Abeja', wallet: buyerWallet?.idwallet ?? '' };
    const result = traspasar(tx, {
      listingId,
      listing,
      exakeys,
      pendientes,
      buyer,
      units: Number(o.amount),
      price: Number(o.price),
      via: 'oferta',
      offerId,
    });
    tx.update(offer.ref, { status: 'aceptada', updatedAt: FieldValue.serverTimestamp() });
    return result;
  });
}

/** Rechazar (vendedor) o retirar (quien oferto). */
export async function cerrarOferta(uid, listingId, offerId, accion) {
  await db.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef(listingId));
    if (!listingSnap.exists) throw new HttpError(404, 'Publicacion no encontrada', { code: 'not_found' });
    const offer = await leerOferta(tx, listingId, offerId);
    if (accion === 'rechazar' && listingSnap.data().sellerUid !== uid) {
      throw new HttpError(403, 'Solo el vendedor puede rechazar ofertas', { code: 'forbidden' });
    }
    if (accion === 'retirar' && offer.data().buyerUid !== uid) {
      throw new HttpError(403, 'Solo quien oferto puede retirar la oferta', { code: 'forbidden' });
    }
    tx.update(offer.ref, {
      status: accion === 'rechazar' ? 'rechazada' : 'retirada',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
