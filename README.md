# Diseyn

SvelteKit + Firebase progressive web application for design browsing, ordering, and multi-role workflows.

## Tech stack

- SvelteKit + TypeScript
- Firebase Auth, Firestore, and Storage
- Tailwind CSS + DaisyUI
- PWA manifest + service worker

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in your Firebase values in `.env`.

4. Run development server:

   ```bash
   npm run dev
   ```

## Firestore configuration

### 1) Configure environments

- For production Firebase, set all `PUBLIC_FIREBASE_*` values in `.env`.
- For local emulators, set:
  - `PUBLIC_FIREBASE_USE_EMULATOR=true`
  - optional host/port values (defaults are already in `.env.example`).

### 2) Start local Firebase emulators

```bash
npm run firebase:emulators
```

This uses `firebase.json` + `.firebaserc`, and boots Auth/Firestore/Storage emulators with the Emulator UI.

### 3) Deploy rules and indexes

```bash
# deploy security rules only
npm run firebase:deploy:rules

# deploy Firestore indexes only
npm run firebase:deploy:indexes

# deploy firestore + storage config
npm run firebase:deploy
```

## Quality checks

- Type/svelte checks:

  ```bash
  npm run check
  ```

- Tests:

  ```bash
  npm run test
  ```

## Firebase data model (MVP)

- `users/{uid}`: roles, profile, active/default role
- `designCategories/{categoryId}`
- `designItems/{designId}`
- `manufacturers/{manufacturerId}`
- `orders/{orderId}`

## Security rules

- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Storage rules: `storage.rules`
