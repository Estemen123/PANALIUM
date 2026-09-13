// Libera el puerto del servidor matando el proceso que lo retiene.
// Uso: npm run port:free            (usa PORT del .env, por defecto 4000)
//      npm run port:free -- 8443    (un puerto concreto)
//
// Existe porque en Windows un `node --watch` reiniciado o una terminal cerrada deja
// al proceso hijo vivo reteniendo el puerto, y arrancar de nuevo falla con EADDRINUSE.
import { execFileSync } from 'node:child_process';
import 'dotenv/config';

const port = Number(process.argv[2] ?? process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Puerto invalido: ${process.argv[2]}`);
  process.exit(1);
}

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** PIDs que estan en LISTEN sobre el puerto (sin contar conexiones de cliente). */
function findPids() {
  if (process.platform === 'win32') {
    const out = run('netstat', ['-ano', '-p', 'TCP']);
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      // Local Address  Foreign Address  State  PID
      if (parts.length < 5 || parts[3] !== 'LISTENING') continue;
      const localPort = Number(parts[1].split(':').pop());
      if (localPort === port) pids.add(Number(parts[4]));
    }
    return [...pids].filter((pid) => Number.isInteger(pid) && pid > 0);
  }

  const out = run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
  return out
    .split('\n')
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

const pids = findPids();
if (pids.length === 0) {
  console.log(`Puerto ${port}: libre, no hay nada que matar.`);
  process.exit(0);
}

for (const pid of pids) {
  if (pid === process.pid) continue;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    console.log(`Puerto ${port}: proceso ${pid} terminado.`);
  } catch (err) {
    console.error(`No se pudo terminar el proceso ${pid}: ${err.message}`);
    process.exitCode = 1;
  }
}
