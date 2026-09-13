import multer from 'multer';
import { storage } from '../config/firebase.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
// Firestore limita cada documento a ~1 MiB; solo cabe una foto inline si es pequena.
const MAX_INLINE_PHOTO_BYTES = 700 * 1024;

/** multer en memoria para un unico campo de imagen de hasta 5 MB. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new HttpError(400, 'La foto debe ser una imagen', { code: 'invalid_photo' }));
    }
    cb(null, true);
  },
});

/**
 * Sube la imagen a Firebase Storage bajo `<folder>/<uid>/`. Si no hay bucket (o falla la subida)
 * la guarda inline como data URI, siempre que sea pequena.
 */
export async function storeImage(file, folder, uid) {
  if (env.FIREBASE_STORAGE_BUCKET) {
    try {
      const bucket = storage.bucket(env.FIREBASE_STORAGE_BUCKET);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const photoPath = `${folder}/${uid}/${Date.now()}-${safeName}`;
      const blob = bucket.file(photoPath);
      await blob.save(file.buffer, { metadata: { contentType: file.mimetype }, resumable: false });
      const [photoUrl] = await blob.getSignedUrl({ action: 'read', expires: '2099-12-31T23:59:59.000Z' });
      return { photoUrl, photoPath };
    } catch (err) {
      console.warn(`[${folder}] fallo la subida a Storage, se guarda inline: ${err?.message}`);
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

export async function deleteStoredImage(photoPath) {
  if (!photoPath || !env.FIREBASE_STORAGE_BUCKET) return;
  try {
    await storage.bucket(env.FIREBASE_STORAGE_BUCKET).file(photoPath).delete({ ignoreNotFound: true });
  } catch (err) {
    console.warn(`[images] no se pudo borrar la imagen ${photoPath}: ${err?.message}`);
  }
}
