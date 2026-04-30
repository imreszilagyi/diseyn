import { env } from '$env/dynamic/private';
import { cert, getApp, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getPrivateKey(): string | undefined {
	if (!env.FIREBASE_ADMIN_PRIVATE_KEY) return undefined;
	return env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
}

function getServiceAccount(): ServiceAccount | null {
	const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
	const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
	const privateKey = getPrivateKey();

	if (!projectId || !clientEmail || !privateKey) return null;

	return {
		projectId,
		clientEmail,
		privateKey
	};
}

const serviceAccount = getServiceAccount();

if (!serviceAccount) {
	throw new Error(
		'Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in server env.'
	);
}

const adminApp =
	getApps()[0] ??
	initializeApp({
		credential: cert(serviceAccount),
		projectId: serviceAccount.projectId,
		storageBucket: env.FIREBASE_ADMIN_STORAGE_BUCKET || env.PUBLIC_FIREBASE_STORAGE_BUCKET
	});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

export function getAdminApp() {
	return getApps()[0] ?? getApp();
}
