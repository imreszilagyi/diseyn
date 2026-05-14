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

### 4) Seed fixed taxonomy (admin)

To upsert the fixed top-level categories and the initial nested path (`Home & Living/Furniture/Dining Room`):

```bash
npm run taxonomy:seed
```

This script requires server admin env vars (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`).

## Server-side Firebase access (Admin SDK)

Client SDK in this project is for browser operations. For trusted server operations, use:

- `src/lib/server/firebase-admin.ts`

This module exposes:

- `adminAuth`
- `adminDb`
- `adminStorage`

Use it only from server files (`+server.ts`, `+page.server.ts`, hooks, server-only modules).

### Get Firebase Admin credentials (service account key)

1. Open Firebase Console and select your project.
2. Go to **Project settings** -> **Service accounts**.
3. Click **Generate new private key**.
4. Download the JSON key file.
5. Copy values from the JSON into server env vars:
   - `project_id` -> `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` -> `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` -> `FIREBASE_ADMIN_PRIVATE_KEY`
6. When setting `FIREBASE_ADMIN_PRIVATE_KEY`, keep newlines escaped as `\\n`.

Example:

```env
FIREBASE_ADMIN_PROJECT_ID=diseyndata
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@diseyndata.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Security notes:

- Never commit service account JSON files.
- Keep `FIREBASE_ADMIN_*` in server-only env/secrets.
- Rotate/revoke keys immediately if leaked.

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
