# AGENTS.md

Project-specific guidance for AI coding agents working in this repository.

## Project Context

- Stack: SvelteKit + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite` in `vite.config.ts`) + DaisyUI v5 (`@plugin "daisyui"` in `src/app.css`).
- Data/auth/storage: Firebase client SDK for browser, Firebase Admin SDK for server-only code.
- Key Firebase modules:
  - Client: `src/lib/firebase/client.ts`
  - Server: `src/lib/server/firebase-admin.ts`

## Coding Rules

1. Preserve client/server boundaries.
   - Use `src/lib/firebase/client.ts` only in browser-safe/shared UI logic.
   - Use `src/lib/server/firebase-admin.ts` only in server contexts (`+server.ts`, `+page.server.ts`, hooks, server modules).
2. Never expose server credentials.
   - Do not add `FIREBASE_ADMIN_*` variables to public env names.
   - Do not commit secrets, key files, or private keys.
3. Keep route role behavior intact.
   - Multi-role dashboard model (`customer`, `manufacturer`, `designer`, `admin`) must continue to work.
4. Follow existing scripts and quality gates.
   - Validate with `npm run check` and `npm run build` after substantive changes.
5. Keep changes minimal and consistent with current structure.
   - Prefer extending existing service/store modules before adding new abstractions.
6. Align styling with TailwindCSS + DaisyUI.
   - Prefer DaisyUI component utilities (`btn`, `card`, `modal`, `navbar`, form controls, alerts, etc.) and semantic theme tokens (`bg-base-100`, `text-base-content`, `primary`, `neutral`, etc.) over bespoke hex colors or one-off utility piles.
   - Reuse patterns from nearby routes and shared layout; themes are set in `src/app.css` via `@plugin "daisyui" { themes: ... }` (currently `light` default and `dark` for `prefers-color-scheme: dark`). New UI should work in both without hard-coding a single theme’s contrast assumptions.

## Firebase Environment Contract

- Public/browser env variables (`PUBLIC_FIREBASE_*`) are expected in `.env`.
- Server/admin env variables (`FIREBASE_ADMIN_*`) are expected only for server-side privileged operations.
- Emulator support is controlled by `PUBLIC_FIREBASE_USE_EMULATOR` and related host/port env values.

## Marketplace Taxonomy Contract

- Catalog taxonomy uses:
  - `designCategories/{categoryId}`
  - `designSubcategories/{subcategoryId}` with `categoryId` foreign key
  - `designItems/{designId}` with `categoryId` and `subcategoryIds[]`
- Designer flow must support selecting existing category/sub-category or creating new ones in context.
- Customer and manufacturer browsing/filtering must support both category and sub-category dimensions.
- Manufacturer capability preferences should be stored on the manufacturer profile as taxonomy subscriptions for MVP (`subscribedCategoryIds[]`, `subscribedSubcategoryIds[]`).

## Firestore Performance Guardrails

- Prefer server-side filtered queries over fetching broad lists and filtering in the UI.
- Keep reference docs (`designCategories`, `designSubcategories`) compact and cache them per view/session where practical.
- Avoid unnecessary writes:
  - skip `updateDoc` when payload is unchanged,
  - use diff-based array updates for subscription toggles.
- Maintain index parity with query changes in `firestore.indexes.json` (especially catalog filters by `status`, `categoryId`, and `subcategoryIds`).
- For list experiences, prefer stable sort fields (`createdAt`) to reduce UI churn and repeated reads.

## Keep This File Up To Date

Update this file whenever one of these changes:

- Core architecture decisions (routing, auth model, role model).
- Firebase initialization contract (env variable names, module paths, emulator strategy).
- Taxonomy contract (category/sub-category schema, subscription model, filter behavior).
- Firestore read/write performance strategy or index/query conventions.
- Required validation commands (build/check/test workflow).
- Security handling rules for credentials.
- Styling stack or DaisyUI/Tailwind theme configuration (plugins, themes, design tokens).

When updating, keep entries short, concrete, and directly actionable.
