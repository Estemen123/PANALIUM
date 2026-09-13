# Arquitectura

Panalium es una SPA React 19 + Vite + Tailwind v4 sin dependencias de estado externas.
La estructura sigue una **arquitectura por capas + feature-based** (inspirada en Clean
Architecture y Feature-Sliced Design). La regla principal es la dirección de las dependencias:

```
app  ->  features  ->  components / store / data  ->  domain  ->  shared
```

Una capa solo puede importar de las capas a su derecha (o de sí misma vía su `index.ts`).
`shared` no conoce el dominio; `domain` no conoce React.

## Capas

| Carpeta | Rol | Puede importar de |
|---|---|---|
| `src/shared/` | Código genérico y reutilizable: primitivas UI (`ui/`), iconos, hooks, utilidades (`lib/`), configuración (`config/`). No sabe nada de compras, grupos ni usuarios. | nada del proyecto (salvo tipos de `domain/common`) |
| `src/domain/` | Modelo de negocio puro en TypeScript: tipos, fábricas (`createBuyingGroup`, `createListing`) y reglas (`canJoinGroup`, `groupProgress`, `listingAfterPurchase`). Sin React. | `shared/lib`, `shared/config` |
| `src/data/` | Fuentes de datos. Hoy solo `mocks/`; cuando exista backend, aquí van los clientes HTTP / repositorios. | `domain` |
| `src/store/` | Estado global con `useReducer` + Context, dividido en *slices* por entidad (`users`, `products`, `groups`, `receipts`). Exponen *action creators* tipados. | `domain`, `data` |
| `src/components/` | Componentes compartidos que sí conocen el dominio (`CurrencySelect`, `RolePill`). | `shared`, `domain` |
| `src/features/` | Un directorio por funcionalidad de negocio. Cada uno contiene `pages/`, `components/`, `hooks/` y un `index.ts` que es su API pública. | todo lo anterior + otras features **solo vía su `index.ts`** |
| `src/app/` | Composición de la aplicación: providers, layout (sidebar), navegación y el registro de rutas. | todo |

## Features

| Feature | Responsabilidad |
|---|---|
| `auth` | `AuthProvider` (login / registro / logout), pantalla de acceso, `useCurrentUser()` |
| `dashboard` | Resumen por rol (stats, grupos recientes, accesos rápidos) |
| `wallet` | Billetera: dirección, balances, movimientos, modal de envío |
| `products` | Marketplace de productos, catálogo del mayorista, alta de producto |
| `groups` | Grupos de compra locales e internacionales: explorar, unirse, crear, mis grupos |
| `receipts` | Recibos ERC-1155: listar, vender, quemar |
| `nft-market` | Mercado secundario de recibos: comprar, cancelar listing |
| `admin` | Panel de administración y gestión de usuarios |

### Anatomía de una feature

```
features/groups/
  hooks/useGroups.ts        <- "casos de uso": leen el store y despachan acciones
  components/GroupCard.tsx  <- UI específica de la feature
  pages/MyGroupsPage.tsx    <- pantalla completa, compone hooks + componentes
  index.ts                  <- API pública (lo único que otras features pueden importar)
```

Los hooks de acciones (`useGroupActions`, `useReceiptActions`, ...) son la única vía de
mutar estado: construyen entidades con las fábricas del dominio y despachan al store.
Los componentes nunca mutan datos directamente.

## Flujo de datos

```
UI (page) -> hook de feature -> domain factory/logic -> dispatch(action) -> reducer (slice) -> nuevo estado -> UI
```

Todo el estado es inmutable; los reducers devuelven copias nuevas.

## Navegación

La navegación es en memoria (`app/navigation`). `View` enumera todas las pantallas y
`app/router/routes.tsx` mapea cada `View` a su página. Para cambiar a `react-router` basta
con reemplazar `NavigationProvider` y `AppRouter`; ninguna feature depende de la implementación.

## Glosario de la colmena

La interfaz usa estrictamente estos términos (ver `docs/design/` para el sistema de diseño):

| Concepto | Término | Dónde vive |
|---|---|---|
| Usuario | Abeja | `domain/user` (`ROLE_META`) |
| Grupo de compra | Panal | `domain/group` (`BuyingGroup`) |
| Subgrupo por punto de retiro | Enjambre | `domain/group` (`Swarm`, `swarmStats`, `canJoinSwarm`) |
| Unidad comprometida | celda | `units` en `GroupMember` |
| Moneda | Honey (HNY) | `domain/common` (`Currency`), `shared/lib/format` |
| Recibo NFT ERC-1155 | Hexakey | `domain/receipt` (`ERC1155Token`) |
| Mercado secundario | Mercado de Abejas | `features/nft-market` |

Estados de un Panal: Recolectando · Panal lleno · Néctar enviado · Sellado · Panal disuelto (`GROUP_STATUS_LABELS`).

## Estilos

Paleta Panalium (carbón, crema, miel, miel claro, oliva, marrón, beige) como tokens en `src/index.css` (`@theme`),
usados como utilidades Tailwind (`bg-card`, `text-muted-foreground`, `border-border`, `bg-honey-light`...).
Tipografías: Bricolage Grotesque (`.display`), Manrope (cuerpo) y JetBrains Mono (`.mono`, cifras de Honey e IDs).
El hexágono (`.hex`, componentes `Hex`, `Avatar`, `AvatarStack`, `HexProgress`) es la unidad visual.
El espejo en JS para estilos inline está en `shared/config/theme.ts`.
No se deben escribir colores hexadecimales dentro de los componentes.

## Cómo hacer cambios comunes

- **Nueva pantalla**: añadir el nombre a `View` (`app/navigation/types.ts`), crear la página en su
  feature, registrarla en `app/router/routes.tsx` y, si va en el menú, en `app/navigation/navConfig.tsx`.
- **Nueva entidad**: tipos + fábrica + lógica en `domain/<entidad>/`, mocks en `data/mocks/`,
  slice en `store/slices/` y añadirlo a `AppState` y `appReducer`.
- **Nueva regla de negocio**: función pura en `domain/<entidad>/logic.ts`; consumirla desde el hook de la feature.
- **Nuevo componente genérico**: `shared/ui/` y exportarlo desde `shared/ui/index.ts`.
- **Conectar un backend**: reemplazar `store/initialState.ts` por una carga asíncrona y, en los hooks de
  acciones, llamar a la API antes de despachar.

## Scripts

```bash
npm run dev          # servidor de desarrollo
npm run typecheck    # tsc --noEmit
npm run build        # build de producción
npm run format       # oxfmt
```
