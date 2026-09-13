import { BaseError } from 'viem';
import multer from 'multer';
import { env } from '../config/env.js';

/** Envuelve handlers async para que los rejects lleguen al error handler de Express 4. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Primer mensaje legible de un error de zod ("campo: mensaje"). */
function firstIssueMessage(zodError) {
  const issue = zodError.issues[0];
  if (!issue) return 'Datos invalidos';
  const field = issue.path.join('.');
  return field ? `${field}: ${issue.message}` : issue.message;
}

/**
 * Valida body/params/query contra un schema de zod.
 * Con `friendly: true` el campo `error` es un mensaje legible (es lo que muestra el frontend)
 * y el codigo de maquina va en `code`.
 */
export const validate = (schema, source = 'body', { friendly = false } = {}) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    if (friendly) {
      return res.status(400).json({
        error: firstIssueMessage(result.error),
        code: 'validation_error',
        fields: result.error.flatten().fieldErrors,
      });
    }
    return res.status(400).json({
      error: 'validation_error',
      details: result.error.flatten().fieldErrors,
    });
  }
  req[source] = result.data;
  next();
};

/** Error con status HTTP y mensaje pensado para mostrarse al usuario. */
export class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', path: req.originalUrl });
}

export function errorHandler(err, req, res, _next) {
  // Errores de viem / ERC-4337 traen detalle util en shortMessage
  if (err instanceof BaseError) {
    console.error('[onchain]', err.shortMessage, err.details ?? '');
    return res.status(400).json({
      error: 'onchain_error',
      message: err.shortMessage ?? err.message,
      details: env.isProd ? undefined : err.details,
    });
  }

  // Errores de subida de archivos (multer): tamano, campo inesperado, etc.
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el maximo de 5 MB' : `Archivo invalido (${err.code})`;
    return res.status(400).json({ error: message, code: 'upload_error', details: err.field });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: env.isProd ? undefined : err.details,
    });
  }

  console.error('[error]', err);
  res.status(err.status ?? 500).json({
    error: 'internal_error',
    message: env.isProd ? 'Error interno' : err.message,
  });
}
