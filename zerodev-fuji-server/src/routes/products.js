import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db, storage, FieldValue } from '../config/firebase.js';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';

/**
 * Catalogo de productos que consume el frontend de Panalium (src/features/products/api.ts):
 *   GET    /api/products        -> { items: Product[] }     cualquier usuario autenticado
 *   GET    /api/products/:id    -> { item: Product }
 *   POST   /api/products        multipart (photo, description, link, minQuantity, unitPrice) -> { item }
 *   PUT    /api/products/:id    multipart, campos opcionales -> { item }
 *   DELETE /api/products/:id    -> 204
 *
 * Publicar/editar/borrar requiere rol wholesaler (proveedor) o admin. Un proveedor solo
 * puede tocar sus propios productos; admin puede tocar todos.
 */
const router = Router();

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
// Firestore limita cada documento a ~1 MiB; solo cabe una foto inline si es pequena.
const MAX_INLINE_PHOTO_BYTES = 700 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new HttpError(400, 'La foto debe ser una imagen', { code: 'invalid_photo' }));
    }
    cb(null, true);
  },
});

const description = z.string().trim().min(1, 'La descripcion es obligatoria').max(2000);
const link = z.string().trim().min(1, 'El enlace es obligatorio').max(2048);
const minQuantity = z.coerce.number().int('Debe ser un entero').positive('Debe ser mayor a 0');
const unitPrice = z.coerce.number().positive('Debe ser mayor a 0');

const createSchema = z.object({ description, link, minQuantity, unitPrice });
const updateSchema = z.object({
  description: description.optional(),
  link: link.optional(),
  minQuantity: minQuantity.optional(),
  unitPrice: unitPrice.optional(),
});

function parseOrThrow(schema, body) {
  // multipart llega con strings vacios para campos no enviados; los tratamos como ausentes.
  const cleaned = Object.fromEntries(Object.entries(body ?? {}).filter(([, v]) => v !== ''));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.');
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue?.message ?? 'Datos invalidos', {
      code: 'validation_error',
      details: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function timestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function serializeProduct(id, data) {
  return {
    id,
    photoUrl: String(data.photoUrl ?? ''),
    description: String(data.description ?? ''),
    link: String(data.link ?? ''),
    minQuantity: Number(data.minQuantity ?? 0),
    unitPrice: Number(data.unitPrice ?? 0),
    createdBy: String(data.createdBy ?? ''),
    createdByName: String(data.createdByName ?? ''),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

async function storeProductImage(file, uid) {
  if (env.FIREBASE_STORAGE_BUCKET) {
    try {
      const bucket = storage.bucket(env.FIREBASE_STORAGE_BUCKET);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const photoPath = `products/${uid}/${Date.now()}-${safeName}`;
      const blob = bucket.file(photoPath);
      await blob.save(file.buffer, { metadata: { contentType: file.mimetype }, resumable: false });
      const [photoUrl] = await blob.getSignedUrl({ action: 'read', expires: '2099-12-31T23:59:59.000Z' });
      return { photoUrl, photoPath };
    } catch (err) {
      console.warn(`[products] fallo la subida a Storage, se guarda inline: ${err?.message}`);
    }
  }

  if (file.size > MAX_INLINE_PHOTO_BYTES) {
    throw new HttpError(
      503,
      'No se pudo subir la foto. Configura FIREBASE_STORAGE_BUCKET o usa una imagen menor a 700 KB.',
      { code: 'storage_unavailable' },
    );
  }
  return { photoUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`, photoPath: '' };
}

async function deleteStoredImage(photoPath) {
  if (!photoPath || !env.FIREBASE_STORAGE_BUCKET) return;
  try {
    await storage.bucket(env.FIREBASE_STORAGE_BUCKET).file(photoPath).delete({ ignoreNotFound: true });
  } catch (err) {
    console.warn(`[products] no se pudo borrar la imagen ${photoPath}: ${err?.message}`);
  }
}

async function loadProductOrThrow(id) {
  const ref = db.collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Producto no encontrado', { code: 'not_found' });
  return { ref, data: snap.data() ?? {} };
}

function assertCanEdit(user, product) {
  if (user.role === 'admin' || product.createdBy === user.uid) return;
  throw new HttpError(403, 'Solo puedes modificar tus propios productos', { code: 'forbidden' });
}

async function displayNameOf(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? String(snap.data()?.displayName ?? '') : '';
}

router.use(requireAuth);

const canPublish = requireRole('wholesaler', 'admin');

/** GET /api/products — catalogo completo, mas reciente primero */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    let query = db.collection('products').orderBy('createdAt', 'desc');
    if (req.query.mine === '1' || req.query.mine === 'true') {
      query = db.collection('products').where('createdBy', '==', req.user.uid);
    }
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => serializeProduct(doc.id, doc.data()));
    if (req.query.mine) items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ items });
  }),
);

/** GET /api/products/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { ref, data } = await loadProductOrThrow(req.params.id);
    res.json({ item: serializeProduct(ref.id, data) });
  }),
);

/** POST /api/products — multipart/form-data con campo `photo` */
router.post(
  '/',
  canPublish,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'La foto del producto es obligatoria', { code: 'photo_required' });
    const input = parseOrThrow(createSchema, req.body);
    const { uid } = req.user;

    const { photoUrl, photoPath } = await storeProductImage(req.file, uid);
    const docRef = await db.collection('products').add({
      ...input,
      photoUrl,
      photoPath,
      createdBy: uid,
      createdByName: await displayNameOf(uid),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: null,
    });
    const created = await docRef.get();
    res.status(201).json({ item: serializeProduct(created.id, created.data() ?? {}) });
  }),
);

/** PUT /api/products/:id — campos opcionales; `photo` reemplaza la imagen */
router.put(
  '/:id',
  canPublish,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const { ref, data } = await loadProductOrThrow(req.params.id);
    assertCanEdit(req.user, data);
    const changes = parseOrThrow(updateSchema, req.body);

    if (req.file) {
      const stored = await storeProductImage(req.file, req.user.uid);
      await deleteStoredImage(data.photoPath);
      changes.photoUrl = stored.photoUrl;
      changes.photoPath = stored.photoPath;
    }

    await ref.set({ ...changes, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const updated = await ref.get();
    res.json({ item: serializeProduct(updated.id, updated.data() ?? {}) });
  }),
);

/** DELETE /api/products/:id */
router.delete(
  '/:id',
  canPublish,
  asyncHandler(async (req, res) => {
    const { ref, data } = await loadProductOrThrow(req.params.id);
    assertCanEdit(req.user, data);
    await deleteStoredImage(data.photoPath);
    await ref.delete();
    res.status(204).send();
  }),
);

export default router;
