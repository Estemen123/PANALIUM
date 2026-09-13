# Panalium

Plataforma Web3 de compra grupal tematizada en la colmena: las Abejas se unen en Panales (divididos en
Enjambres por punto de retiro) para alcanzar el mínimo de un proveedor, pagan en Honey y reciben Hexakeys
(recibos ERC-1155) que pueden reclamar o revender en el Mercado de Abejas.

Stack: React 19, Vite, TypeScript, Tailwind CSS v4. Sin backend (datos mock en memoria).

## Inicio rápido

```bash
npm install
npm run dev
```

Cuentas demo en la pantalla de acceso (Abeja, Proveedor, Guardián). Sistema de diseño y wireframes en `docs/design/`.

## Estructura

```
src/
  app/        composición: providers, layout, navegación, rutas
  features/   una carpeta por funcionalidad (auth, dashboard, wallet, products, groups, receipts, nft-market, admin)
  components/ componentes compartidos que conocen el dominio
  store/      estado global (useReducer + Context) por slices
  data/       datos mock (futuro: clientes API)
  domain/     tipos, fábricas y reglas de negocio puras
  shared/     UI genérica, iconos, hooks, utilidades, tokens de diseño
```

La guía completa está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run typecheck` | Verificación de tipos |
| `npm run build` | Build de producción |
| `npm run format` | Formatea el código con oxfmt |
