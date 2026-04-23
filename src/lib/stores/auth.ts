import { browser } from '$app/environment';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { get, writable } from 'svelte/store';
import { auth, db } from '$lib/firebase/client';
import type { UserProfile, UserRole } from '$lib/types/domain';
import { getHighestRole } from '$lib/utils/roles';

export const authUser = writable<User | null>(null);
export const authLoading = writable(true);
export const userProfile = writable<UserProfile | null>(null);

export async function ensureUserProfile(user: User): Promise<UserProfile> {
	if (!db) {
		throw new Error('Firestore is not configured');
	}

	const ref = doc(db, 'users', user.uid);
	const snapshot = await getDoc(ref);

	if (snapshot.exists()) {
		return snapshot.data() as UserProfile;
	}

	const profile: UserProfile = {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		roles: ['customer'],
		defaultRole: 'customer',
		activeRole: 'customer'
	};

	await setDoc(ref, profile, { merge: true });
	return profile;
}

export async function switchActiveRole(role: UserRole): Promise<void> {
	if (!db) return;

	const current = get(userProfile);

	if (current === null || !current.roles.includes(role)) return;

	const updated: UserProfile = { ...current, activeRole: role };
	await setDoc(doc(db, 'users', current.uid), { activeRole: role }, { merge: true });
	userProfile.set(updated);
}

export async function logout(): Promise<void> {
	if (!auth) return;
	await signOut(auth);
}

if (browser && auth) {
	onAuthStateChanged(auth, async (user) => {
		authUser.set(user);
		if (user) {
			userProfile.set(await ensureUserProfile(user));
		} else {
			userProfile.set(null);
		}
		authLoading.set(false);
	});
}
