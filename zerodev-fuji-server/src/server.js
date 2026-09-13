import { createApp } from './app.js';
import { env } from './config/env.js';
import { chain } from './config/chain.js';
import { iniciarSchedulerPanales } from './services/panalLifecycle.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
  console.log(`Red: ${chain.name} (${chain.id})`);
  // Sella los Panales cuyo cobro vencio con el minimo pagado y emite sus ExaKeys.
  if (iniciarSchedulerPanales()) console.log(`Scheduler de Panales cada ${env.PANAL_SCHEDULER_SEGUNDOS}s`);
});

/**
 * Sin este handler, un puerto ocupado revienta como 'error' no manejado y suelta un stack
 * trace que no dice que hacer. Pasa seguido en Windows: al reiniciar `node --watch` o al
 * cerrar la terminal, el proceso hijo puede quedar vivo reteniendo el puerto.
 */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${env.PORT} ya esta ocupado. Otra instancia del servidor sigue viva.`);
    console.error('Para liberarlo:');
    console.error(`  Windows:  npm run port:free       (o: netstat -ano | findstr :${env.PORT})`);
    console.error(`  macOS/Linux:  lsof -ti:${env.PORT} | xargs kill`);
    console.error('O cambia PORT en el .env (recuerda ajustar el proxy del frontend en vite.config.ts).\n');
    process.exit(1);
  }
  if (err.code === 'EACCES') {
    console.error(`\nSin permisos para escuchar en el puerto ${env.PORT}. Usa un puerto por encima de 1024.\n`);
    process.exit(1);
  }
  console.error('[server] error al escuchar:', err);
  process.exit(1);
});

/**
 * Cierre ordenado. `SIGHUP` cubre el cierre de la terminal en Windows y `message` el
 * shutdown que manda un proceso padre; sin ellos el hijo sobrevive y retiene el puerto.
 */
let closing = false;
function shutdown(reason) {
  if (closing) return;
  closing = true;
  console.log(`${reason} recibido, cerrando...`);
  server.close(() => process.exit(0));
  // Si alguna conexion abierta no deja cerrar, salimos igual pasados 10 s.
  setTimeout(() => process.exit(1), 10_000).unref();
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => shutdown(signal));
}
// El padre murio: si quedamos huerfanos, no retengas el puerto.
process.on('disconnect', () => shutdown('disconnect'));
