# Smart Accounts en Avalanche Fuji — Express + ZeroDev + viem + Firebase

Backend Node.js/Express donde cada usuario de Firebase tiene una **cuenta abstracta (ERC-4337, Kernel v3.1)** en Avalanche Fuji, y todas las operaciones on-chain se envían **sin gas para el usuario** gracias al paymaster de ZeroDev.

## Arquitectura

```
Cliente (web/mobile)
   │  Firebase Auth → ID token
   ▼
Express  ──requireAuth──►  uid de Firebase
   │
   ├── keyVault      : private key del signer, cifrada AES-256-GCM en Firestore
   ├── smartAccount  : signer → ECDSA validator → Kernel account → Kernel client
   └── wallet        : encodeCalls → sendUserOperation (patrocinada) → receipt
                                │
                                ▼
                   ZeroDev RPC (bundler + paymaster)  →  Avalanche Fuji (43113)
```

Piezas clave:

- **Signer**: una llave ECDSA por usuario, generada en el servidor y cifrada. No es la cuenta del usuario, es solo quien firma.
- **Smart account**: dirección *contrafactual* derivada del signer. Existe antes de desplegarse; el contrato se despliega solo con la primera UserOp.
- **Paymaster**: patrocina el gas según la policy del dashboard de ZeroDev. El usuario nunca necesita AVAX.

## Setup

### 1. Instalar

```bash
npm install
cp .env.example .env
```

### 2. ZeroDev

1. Crea un proyecto en [dashboard.zerodev.app](https://dashboard.zerodev.app) y agrega la red **Avalanche Fuji (43113)**.
2. Copia el RPC (API v3, formato `https://rpc.zerodev.app/api/v3/<PROJECT_ID>/chain/43113`). El mismo RPC funciona como bundler y como paymaster.
3. **Crea una gas policy** en la sección de paymaster. Sin policy el paymaster rechaza las UserOps con un error tipo `AA33 reverted` o "no policy matched". Conviene poner límites por proyecto y por cuenta.

### 3. Firebase

Necesitas el Admin SDK para verificar los ID tokens:

- En Cloud Run / GCE: basta con `FIREBASE_PROJECT_ID` (usa credenciales por defecto).
- Fuera de GCP (desarrollo local): guarda el service account JSON en `.secrets/serviceAccountKey.json`
  (ignorado por git) y deja `GOOGLE_APPLICATION_CREDENTIALS=./.secrets/serviceAccountKey.json`. Para deploy
  usa `FIREBASE_SERVICE_ACCOUNT_BASE64`.

Scripts de administración (usan la misma configuración del servidor):

```bash
npm run user:check -- <uid|email>                    # Auth, claims y doc users/{uid}
npm run user:role  -- <uid|email> <buyer|wholesaler|admin>
```

Firestore se usa para guardar las llaves cifradas (colección `wallet_keys`). Bloquea esa colección en las reglas de seguridad — solo el Admin SDK debe tocarla:

```
match /wallet_keys/{uid} {
  allow read, write: if false;
}
```

### 4. Master key de cifrado

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guárdala en `KEY_ENCRYPTION_MASTER_KEY`. En producción muévela a Secret Manager o, mejor, usa KMS para envolver la llave en vez de una master key en env.

### 5. Correr

```bash
npm run dev
```

## Endpoints

Todos requieren `Authorization: Bearer <firebase-id-token>` salvo los marcados como públicos y `/health`.

### Panalium (los consume el frontend `panalium/`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/config/firebase` | público | Config del SDK web (la de `initializeApp`), para que el cliente no la hardcodee |
| GET | `/api/config/chain` | público | Red on-chain: id (decimal y hex), nombre, moneda nativa, RPC, explorador y token de la app |
| POST | `/api/auth/register` | público | Crea usuario (`email`, `password`, `displayName`, `phone?`, `role?` = `buyer` \| `wholesaler`). Responde `{ uid, email, role }` |
| POST | `/api/auth/login` | público | `{ email, password }` -> `{ idToken, refreshToken, expiresIn, uid, user, profile, wallet }`. Crea la wallet si falta |
| POST | `/api/auth/refresh` | público | `{ refreshToken }` -> `{ idToken, refreshToken, expiresIn, uid }` |
| POST | `/api/auth/reset-password` | público | `{ email }`. Responde 200 aunque el correo no exista |
| GET | `/api/auth/me` | cualquiera | `{ uid, claims, profile, wallet }`. Crea el doc `users/{uid}` y la wallet si faltan |
| POST | `/api/auth/create-admin` | admin | Crea un usuario con rol `admin` |
| GET | `/api/products` | cualquiera | `{ items }`. Con `?mine=1` solo los del usuario |
| GET | `/api/products/:id` | cualquiera | `{ item }` |
| POST | `/api/products` | wholesaler, admin | `multipart/form-data`: `photo`, `description`, `link`, `minQuantity`, `unitPrice` |
| PUT | `/api/products/:id` | dueño o admin | Mismos campos, todos opcionales |
| DELETE | `/api/products/:id` | dueño o admin | 204 |
| GET | `/api/panales/config` | cualquiera | `{ advancePercent, contractAddress, exakeyContract, collectionHours, defaultProfitPercent }` |
| GET | `/api/panales` | cualquiera | `{ items }` con `stage`, `members`, `currentUnits`, `paidUnits`, `finalUnitPrice`, `quote`, `collectionEndsAt`, `tokenId`. Con `?mine=1` solo donde el usuario participa |
| GET | `/api/panales/:id` | cualquiera | `{ item }` con `onchain` leído de `panales(panalId)` en EscrowPanales |
| POST | `/api/panales` | cualquiera | `multipart/form-data`: `photo?`, `type`, `description`, `link`, `minQuantity`, `targetUnits?`, `unitPrice`, `deadline` (YYYY-MM-DD), `units`. UserOp de la smart account (paymaster ZeroDev): `approve` del adelanto (40% de `units`) + `crearPanal(panalId, precio, minimo, objetivo, finReservas, unidadesCreador)` |
| POST | `/api/panales/:id/join` | cualquiera | `{ units }`. Reservando: `approve` + `unirseAlPanal` (adelanto). Cobrando: `approve` + `unirseAlPanalConPagoCompleto` (total al precio final) |
| POST | `/api/panales/:id/aumentar` | miembro | `{ units }` extra. El contrato no deja reservar dos veces, así que va en una UserOp atómica: `salirDelPanal` + `approve` + volver a entrar con el total (adelanto en reservas, pago completo en cobro) |
| POST | `/api/panales/:id/pagar-saldo` | miembro | `approve` + `pagarSaldo`: precio final × celdas − lo pagado |
| POST | `/api/panales/:id/reembolsar` | miembro | `reembolsar`: Panal cancelado, o sellado sin haber pagado el restante |
| POST | `/api/panales/:id/negociacion` | admin | `iniciarCotizacion` (master). Exige el mínimo reservado. Se dispara solo cuando el Panal llena su objetivo |
| POST | `/api/panales/:id/cotizacion/estimar` | admin | `{ precioProveedorUnidad, envioTotal, otrosCostos, gananciaPorcentaje }` → `{ quote }` con desglose por celda y por Abeja. No toca la cadena |
| POST | `/api/panales/:id/cotizacion` | admin | Mismo body. `abrirRecoleccion(precioFinal, ahora + PANAL_COBRO_HORAS)` (master): empieza el cobro del restante |
| POST | `/api/panales/:id/extender` | admin | `{ hours }`. `extenderPlazo` si el cobro venció sin el mínimo pagado |
| POST | `/api/panales/:id/sellar` | admin | Tras vencer el cobro con el mínimo pagado: `liberarFondos` + `sellarPanal` (Fuji) + `crearExaKeys` (HashKey) + documentos en `exakeys`. Idempotente; el scheduler lo hace solo |
| POST | `/api/panales/:id/cancelar` | admin | `cancelarPanal`; cada Abeja recupera lo pagado con `/reembolsar` |
| POST | `/api/panales/:id/sync` | admin | Relee la cadena y actualiza Firestore |
| GET | `/api/exakeys` | cualquiera | `{ items }` ExaKeys del usuario (una por unidad). Admin: `?all=1` o `?panalId=` |

El rol sale del custom claim `role`; si no existe se lee de `users/{uid}.role` (por defecto `buyer`).
En estas rutas el campo `error` es un mensaje legible para el usuario y `code` el código de máquina.

**Los dos SDK de Firebase.** El servidor usa el **Admin SDK** (service account) para verificar ID tokens,
leer y escribir Firestore y administrar usuarios. El Admin SDK no puede validar contraseñas, así que
`/api/auth/login`, `/api/auth/refresh` y `/api/auth/reset-password` van contra la REST de Identity Toolkit
usando `FIREBASE_API_KEY`, la misma config **pública** del SDK web. Si no defines `FIREBASE_API_KEY`
esas tres rutas responden 501 y el resto del servidor funciona igual: el frontend de Panalium hace login
con su propio SDK web y solo manda el ID token resultante.

**Wallet por usuario.** Cada Abeja tiene una smart account registrada en la colección `wallet`:

```json
{ "idwallet": "0x7Df7...71B1", "createdBy": "<uid>", "chainId": 43113, "createdAt": "...", "updatedAt": null }
```

Se crea sola en tres momentos: al registrarse, al iniciar sesión y al pedir `/api/account/me`. Quien ya
tenía cuenta antes de que esto existiera recibe la suya la próxima vez que entre, y un documento que
quedó con `idwallet` vacío se completa en vez de duplicarse. La operación es idempotente y está dentro
de una transacción, así que varias peticiones simultáneas no crean documentos repetidos.

La dirección es **contrafactual**: se deriva del signer del usuario (guardado cifrado en `wallet_keys`),
existe antes de desplegarse y no cuesta gas registrarla. El contrato se despliega con la primera UserOp.
Como se deriva del signer, borrar el documento y volver a crearlo devuelve **la misma dirección**.

Si ZeroDev o el RPC fallan, el registro y el login **no se caen**: la wallet se reintenta en la siguiente
petición. Para los usuarios que ya existen hay un backfill:

```bash
npm run wallets:backfill -- --dry-run   # informa sin escribir
npm run wallets:backfill                # crea las que falten
```

**Moneda de la app (USDC).** El frontend muestra los saldos en USDC y permite fondear la smart
account desde MetaMask. Qué token se envía lo decide el backend con `USDC_TOKEN_ADDRESS`:

- **Con dirección configurada**: se envía ese ERC-20 y se muestra su saldo real, leído on-chain.
- **Vacío** (estado actual): no hay ERC-20 en Fuji por defecto, así que el fondeo y el saldo son
  en AVAX nativo. La interfaz se adapta sola y dice AVAX en vez de USDC.

Para activar USDC pon la dirección del contrato en `USDC_TOKEN_ADDRESS` (y sus decimales en
`USDC_TOKEN_DECIMALS`, 6 por defecto) y **reinicia el servidor**: el watcher sólo vigila `./src`,
así que un cambio en `.env` no se recoge solo.

**Fotos de producto.** Con `FIREBASE_STORAGE_BUCKET` se suben a Storage y se devuelve una URL firmada.
Si el bucket no existe la subida falla y la foto cae a un data URI inline en Firestore, con tope de ~700 KB
(Firestore limita el documento a 1 MiB). Hoy el proyecto `panalium-b5fb0` **no tiene Storage habilitado**,
así que se está usando el modo inline; al activarlo en la consola el código lo empieza a usar sin cambios.

### Ciclo de vida del Panal

Etapas del contrato EscrowPanales (verificadas contra el contrato desplegado) y su nombre en Firestore (`stage`):

| # | Etapa | Qué pasa |
|---|---|---|
| 0 | `reservando` | Las Abejas reservan pagando el 40%. Al llenar el objetivo se inicia la negociación sola |
| 1 | `negociando` | Se habla con el proveedor; nadie más entra. El admin calcula el precio real: `(proveedor × celdas + envío + otros) × (1 + comisión%) / celdas` |
| 2 | `cobrando` | `abrirRecoleccion` con el precio final: `PANAL_COBRO_HORAS` (48 h) para pagar el restante. Nuevas Abejas entran pagando el total |
| 3 | `liberado` | Venció el cobro con el mínimo pagado: `liberarFondos` manda los USDC a la tesorería (master) |
| 4 | `sellado` | `sellarPanal` + `crearExaKeys(tokenId, unidadesPagadas)` en HashKey. Quien no pagó el restante recupera su adelanto |
| 5 | `cancelado` | Todos recuperan lo pagado |

El contrato no permite sellar ni liberar antes de que venza el plazo de cobro, aunque todos hayan pagado. El scheduler
(`PANAL_SCHEDULER_SEGUNDOS`, 60 s) sella y emite las ExaKeys de los Panales vencidos con el mínimo pagado.

Las ExaKeys (ERC-1155 en HashKey Chain Testnet, `CONTRATO_HSK`) se acuñan todas a la wallet master, que queda como
custodio. La propiedad de cada unidad vive en Firestore.

Colecciones de Firestore:

| Colección | Contenido |
|---|---|
| `panales/{panalId}` | Panal: `stage`, `members` (celdas, pagado, `paidComplete`), `quote`, `collectionEndsAt`, `txs`, `tokenId`, `exakeys` |
| `panales/{panalId}/cotizaciones` | Historial de cotizaciones (`estimada` / `aplicada`) con el desglose por Abeja |
| `pagos` | Cada movimiento de USDC: `adelanto`, `pago_completo`, `aumento`, `saldo`, `reembolso` |
| `exakeys/{tokenId}-{serial}` | Una ExaKey por unidad de producto, con `ownerUid`, `ownerWallet`, `custodian` y la tx de acuñación |
| `counters/exakeys` | Siguiente `tokenId` de ExaKey1155 |

### Smart accounts

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health`, `/api/health` | Estado y red |
| GET | `/api/account/me` | Dirección de la smart account, si está desplegada, balance AVAX |
| GET | `/api/account/token/:token` | Balance de un ERC-20 |
| POST | `/api/tx/native` | Enviar AVAX |
| POST | `/api/tx/erc20` | Transferir un ERC-20 |
| POST | `/api/tx/contract` | Llamada arbitraria (ABI + función + args) |
| POST | `/api/tx/batch` | Varias calls en una sola UserOp |
| GET | `/api/tx/status/:userOpHash` | Estado de una UserOp |

### Conexión con el frontend

El frontend (`panalium/`, Vite en el puerto 8443) llama a `/api/...` y su `vite.config.ts` proxea `/api`
a `http://localhost:4000`, por eso este servidor corre en `PORT=4000`. Si se despliegan por separado,
construye el frontend con `VITE_API_BASE_URL=https://<tu-servidor>/api` y agrega ese origen a `CORS_ORIGINS`.

### Ejemplos

```bash
# Obtener / crear la cuenta
curl http://localhost:3000/api/account/me -H "Authorization: Bearer $ID_TOKEN"
```

```bash
# Enviar AVAX (gas patrocinado)
curl -X POST http://localhost:3000/api/tx/native \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"0x1234...","amountAvax":"0.01"}'
```

```bash
# Batch: approve + transferFrom en una sola operación
curl -X POST http://localhost:3000/api/tx/batch \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calls": [
      {"to":"0xToken...","abi":[...],"functionName":"approve","args":["0xSpender...","1000000"]},
      {"to":"0xSpender...","abi":[...],"functionName":"deposit","args":["1000000"]}
    ]
  }'
```

### Cliente

```js
import { getAuth } from 'firebase/auth';

const idToken = await getAuth().currentUser.getIdToken();

const res = await fetch(`${API_URL}/api/tx/native`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ to, amountAvax: '0.01' }),
});
```

`getIdToken()` ya maneja el refresh; llámalo antes de cada request en vez de cachearlo tú.

## Problemas comunes

**Los pagos se quedan esperando ("Pagando en Avalanche...").** El RPC público `api.avax-test.network` corta con
`429` (Cloudflare 1015) y un `Retry-After` de ~30 minutos cuando recibe muchas lecturas desde la misma IP (por
ejemplo un fork de Hardhat). viem respetaría ese tiempo, así que el transporte de Fuji no reintenta por RPC y
salta a los de `AVALANCHE_RPC_FALLBACKS` (por defecto `publicnode`). Comprueba con
`curl -i -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' https://api.avax-test.network/ext/bc/C/rpc`.

**`EADDRINUSE: address already in use :::4000`.** Quedó otra instancia viva. En Windows, cerrar la
terminal o reiniciar el watcher deja al proceso hijo reteniendo el puerto. `npm run dev` ya libera el
puerto antes de arrancar; para hacerlo a mano:

```bash
npm run port:free
```

**502 (Bad Gateway) en el frontend con el backend aparentemente arriba.** Lo causaba `node --watch`,
que vigila también `node_modules`: firebase-admin toca archivos ahí durante las llamadas a la API, el
watcher reiniciaba el proceso a media petición y el proxy de Vite recibía la conexión cortada. El
trabajo llegaba a hacerse (el usuario se creaba) pero el cliente veía un 502. Por eso `dev` usa
`--watch-path=./src`, que limita la vigilancia al código propio. No lo cambies a `--watch` a secas.

**El frontend no levanta (`httpServerStart`).** El puerto 8443 ya está ocupado por otro Vite. Solo
debe correr uno: `npm run port:free -- 8443` o reutiliza el que ya está corriendo.

## Cosas a tener en cuenta

**Nonce y concurrencia.** Dos UserOps simultáneas de la misma cuenta chocan por nonce y una falla. `withAccountLock` las serializa, pero es un lock **por proceso**. Si corres varias instancias necesitas un lock distribuido (Redis) o keys de nonce paralelas.

**`waitForReceipt`.** Por defecto los endpoints esperan el recibo (puede tardar segundos). Para no bloquear el request manda `"waitForReceipt": false` y consulta `/api/tx/status/:userOpHash` después, o notifica por webhook.

**Costo del paymaster.** El gas lo pagas tú. El rate limit de 10 ops/minuto por usuario es lo mínimo; agrega también límites de monto y allowlist de contratos destino antes de ir a mainnet.

**Custodia.** Este diseño es custodial: con acceso al servidor + master key se controlan todos los fondos. Alternativas si eso no te sirve:
- Passkeys en el cliente (`@zerodev/passkey-validator`): el usuario firma, el servidor solo arma y relaya la UserOp.
- Session keys (`@zerodev/permissions`): el usuario aprueba una llave temporal con permisos acotados (solo ciertos contratos, monto máximo, expiración) y el servidor firma solo dentro de esos límites. Es el punto medio más usado.

**Primera UserOp.** Es más cara que las siguientes porque incluye el despliegue del contrato de la cuenta. Ténlo en cuenta en los límites de la policy.

**EntryPoint.** Se usa 0.7 + Kernel v3.1, lo recomendado para proyectos nuevos. No mezcles versiones: cambiar de EntryPoint o de versión de Kernel genera una **dirección distinta** para el mismo signer.
