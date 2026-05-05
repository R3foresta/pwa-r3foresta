# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (tsc -b) then bundle with Vite
npm run lint      # ESLint on the whole project
npm run preview   # Serve the production build locally
```

No test runner is configured.

## Environment

Copy `.env.example` to `.env` and set:
```
VITE_API_URL=http://localhost:3000
```

All environment variables are `VITE_*` and accessed via `import.meta.env.*`. There is no other required configuration.

## Tech Stack

- **React 19 + TypeScript 5.9** with Vite 7
- **React Router v6** — nested layouts, route guards
- **Tailwind CSS v3** — custom `brand` palette (forest greens), `Manrope` display font
- **react-leaflet + leaflet** — georeferenced map with custom SVG `divIcon` markers (chunked into `leaflet-vendor`)
- **@passwordless-id/webauthn** — passkey authentication (no passwords)
- **NestJS backend** (external) at `VITE_API_URL/api/*`

## Architecture

### Layers (bottom-up)

```
src/api/            Raw fetch functions only — no business logic, return Response
src/services/       Business logic: parse JSON, normalize pagination, validate, call mappers
module/mappers/     Transform backend DTOs → typed UI view models
module/hooks/       React state + side effects; consume services, expose loading/error/data
module/screens/     Route-mounted components; delegate all logic to hooks
module/components/  Module-local UI
```

The `src/api/` and `src/services/` directories hold cross-module concerns. Each mature module (e.g., `vivero/`) replicates this same layering internally: `mappers/`, `hooks/`, `types/contracts.ts` (backend shapes/enums), `types/view-models.ts` (UI shapes).

### Route tree

```
main.tsx (BrowserRouter + AuthProvider)
  └─ App.tsx
      ├─ GuestRoute  → AuthLayout  → Login / Register / Recover
      ├─ /complete-profile          → CompleteProfileScreen (auth required, profile not required)
      └─ ProtectedRoute → AppLayout (BottomNav + Outlet)
          └─ /app/*  → module screens
```

- `GuestRoute` redirects authenticated users away; `ProtectedRoute` redirects unauthenticated users to `/auth/login`.
- Profile completeness (`doc_identidad` + `apellido` + `nombre`) is checked client-side via `ProfileService.isProfileComplete()`.

### Authentication

WebAuthn passkey flow: `GET /api/auth/challenge` → browser biometric → `POST /api/auth/register` or `/login` → `{ token, auth_id }`.

Token is stored in `localStorage` as `authToken`; user state in `localStorage` as `r3foresta:user`. `AuthContext` hydrates synchronously from `localStorage` then re-validates via `ProfileService.getUserProfile()` on mount.

Every API call includes two headers: `Authorization: Bearer <token>` and `x-auth-id: <auth_id>`. Some endpoints also receive `x-user-role`.

### State management

Only React Context — no Redux or Zustand:
- `AuthContext` — global session, persisted to `localStorage`.
- `RecoleccionFormContext` — ephemeral state shared across the 3-step recolección wizard (`/new` → `/new/location` → `/new/summary`).

### Multi-step form pattern

`RecoleccionFormLayout` wraps three nested routes. Steps share state via `RecoleccionFormContext` so no prop drilling. File uploads (photos) use `FormData` with a `fotos` field; client-side validation enforces 2–5 files, ≤5 MB, JPG/PNG only.

### Vivero stage filtering

The vivero module is the most mature example of the full layering. Backend is queried with coarse `estado_lote` (ACTIVO/FINALIZADO). Client-side `matchesStageFilter()` in `utils/` applies finer sub-stage filtering on `subetapa_actual` and `plantas_vivas_iniciales`. This decouples UI stages (INICIO / EMBOLSADO / ADAPTABILIDAD / DESPACHO) from backend capabilities.

### Stale request protection

Hooks that fire concurrent async requests (e.g., `useViveroLots`) track a `requestIdRef`. On each new fetch, the ref is incremented; responses are discarded if their captured ID no longer matches.

### Placeholder pattern

Unimplemented routes (`/app/planting`, `/app/co2`, `/app/scan`) render `<PlaceholderScreen title="...">` so routing is wired before screens exist.

## Module READMEs

Two modules have detailed architecture docs worth reading before modifying them:
- [src/modules/vivero/README.md](src/modules/vivero/README.md) — layer responsibilities, maintenance rules, next steps
- [src/modules/user_profile/README.md](src/modules/user_profile/README.md) — complete-profile flow, API contracts, validation, auth state machine

## Other reference docs

Top-level docs that are not loaded automatically but are authoritative when relevant:
- [AGENTS.md](AGENTS.md) — agent workflow rules, what to read before coding, what not to break
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) — frontend patterns, conventions, do/don't list
- [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md) — known tech debt and refactor targets (consult for cleanup tasks)
- [DOMAIN_INDEX.md](DOMAIN_INDEX.md) — domain glossary and entity reference
- [README.md](README.md) — DB ER diagram (Mermaid) for the backend schema; otherwise default Vite template
