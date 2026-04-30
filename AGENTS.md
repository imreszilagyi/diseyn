# AGENTS.md

Project-specific guidance for AI coding agents working in this repository.

## Project Context

- Stack: SvelteKit + TypeScript + TailwindCSS + DaisyUI.
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

## Firebase Environment Contract

- Public/browser env variables (`PUBLIC_FIREBASE_*`) are expected in `.env`.
- Server/admin env variables (`FIREBASE_ADMIN_*`) are expected only for server-side privileged operations.
- Emulator support is controlled by `PUBLIC_FIREBASE_USE_EMULATOR` and related host/port env values.

## Keep This File Up To Date

Update this file whenever one of these changes:

- Core architecture decisions (routing, auth model, role model).
- Firebase initialization contract (env variable names, module paths, emulator strategy).
- Required validation commands (build/check/test workflow).
- Security handling rules for credentials.

When updating, keep entries short, concrete, and directly actionable.
