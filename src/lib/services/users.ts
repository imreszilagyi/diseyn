import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { UserProfile, UserRole } from '$lib/types/domain';

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
	const snapshot = await getDoc(doc(requireDb(), 'users', uid));
	return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export async function assignRoles(uid: string, roles: UserRole[]): Promise<void> {
	await updateDoc(doc(requireDb(), 'users', uid), {
		roles
	});
}

export async function saveUserProfile(payload: UserProfile): Promise<void> {
	await setDoc(doc(requireDb(), 'users', payload.uid), payload, { merge: true });
}
