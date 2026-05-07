import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

const firebaseConfig = {
	apiKey: env.PUBLIC_FIREBASE_API_KEY,
	authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: env.PUBLIC_FIREBASE_APP_ID,
	measurementId: env.PUBLIC_FIREBASE_MEASUREMENT_ID
} as const;

const hasCoreConfig =
	!!firebaseConfig.apiKey &&
	!!firebaseConfig.authDomain &&
	!!firebaseConfig.projectId &&
	!!firebaseConfig.storageBucket &&
	!!firebaseConfig.messagingSenderId &&
	!!firebaseConfig.appId;
const useEmulator = env.PUBLIC_FIREBASE_USE_EMULATOR === 'true';

const emulatorHost = env.PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const firestoreEmulatorPort = Number(env.PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);
const authEmulatorPort = Number(env.PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099);
const storageEmulatorPort = Number(env.PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || 9199);
const emulatorGuardKey = '__diseyn_firebase_emulator_connected__';

const canInit = browser && hasCoreConfig;
export const firebaseApp = canInit ? initializeApp(firebaseConfig) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const analytics =
	firebaseApp && env.PUBLIC_FIREBASE_MEASUREMENT_ID
		? isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
		: Promise.resolve(null);

if (canInit && useEmulator && auth && db && storage && !(emulatorGuardKey in globalThis)) {
	(globalThis as unknown as Record<string, boolean>)[emulatorGuardKey] = true;
	connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`, {
		disableWarnings: true
	});
	connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);
	connectStorageEmulator(storage, emulatorHost, storageEmulatorPort);
}
