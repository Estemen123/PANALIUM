# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Composition root: wraps the app in `AppProviders` and switches between `AuthPage` and the authenticated `AppLayout` + `AppRouter`
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import and all design tokens (`@theme`)
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, typecheck and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

### Source layout (layered, feature-based)

Dependency direction: `app -> features -> components / store / data -> domain -> shared`. See `docs/ARCHITECTURE.md` for the full guide.

- `src/shared/` - Domain-agnostic building blocks: `ui/` (Button, Card, Input, Modal, Toast, ...), `icons/`, `hooks/`, `lib/` (format, number, id, date), `config/` (brand, categories, theme colors)
- `src/domain/` - Pure TypeScript business model per entity (`user`, `product`, `group`, `receipt`, `wallet`): types, factories and rules. No React
- `src/data/mocks/` - Seed data (users, products, groups, tokens, listings, transactions)
- `src/store/` - Global state (`useReducer` + Context) split into slices with typed action creators; `useAppState()` / `useAppDispatch()`
- `src/components/` - Shared components that know the domain (`CurrencySelect`, `RolePill`)
- `src/features/<name>/` - One folder per business capability with `pages/`, `components/`, `hooks/` and a public `index.ts`. Features: `auth`, `dashboard`, `wallet`, `products`, `groups`, `receipts`, `nft-market`, `admin`
- `src/app/` - `providers/` (provider tree), `layout/` (sidebar shell), `navigation/` (`View` type, `useNavigation`, per-role menu), `router/` (`View` -> page registry)

### Conventions

- Add a screen: extend `View` in `src/app/navigation/types.ts`, build the page in its feature, register it in `src/app/router/routes.tsx` (and `navConfig.tsx` for the menu).
- Mutate state only through feature action hooks (`useGroupActions`, `useReceiptActions`, ...) that build entities with domain factories and dispatch to the store.
- Use theme utilities (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary/10`) instead of hard-coded hex colors; JS mirror in `src/shared/config/theme.ts`.
- Cross-feature imports go through the feature `index.ts` only.
- UI copy uses the Panalium glossary strictly: Abeja (user), Panal (buying group), Enjambre (subgroup by pickup point), celda (committed unit), Honey/HNY (currency), Hexakey (ERC-1155 receipt), Mercado de Abejas (secondary market). See `docs/ARCHITECTURE.md`.
- Declare multi-member object types as named `interface`s, never as inline `{ a: string; b: number }` literals: oxfmt 0.2 strips the separators inside inline object types and breaks the build.

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
