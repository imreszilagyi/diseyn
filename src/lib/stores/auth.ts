import { browser } from '$app/environment';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { get, writable } from 'svelte/store';
import { auth, db } from '$lib/firebase/client';
import type { UserProfile, UserRole } from '$lib/types/domain';

export const authUser = writable<User | null>(null);
export const authLoading = writable(true);
export const userProfile = writable<UserProfile | null>(null);

const baselineRoles: UserRole[] = ['customer', 'designer', 'manufacturer'];
const roleOrder: UserRole[] = ['customer', 'designer', 'manufacturer', 'admin'];

function normalizeProfile(user: User, current?: UserProfile): { profile: UserProfile; changed: boolean } {
	const roleSet = new Set<UserRole>([...(current?.roles ?? []), ...baselineRoles]);
	const roles = roleOrder.filter((role) => roleSet.has(role));
	const defaultRole = current?.defaultRole && roles.includes(current.defaultRole) ? current.defaultRole : 'customer';
	const activeRole = current?.activeRole && roles.includes(current.activeRole) ? current.activeRole : defaultRole;

	const profile: UserProfile = {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		roles,
		defaultRole,
		activeRole
	};

	const changed =
		current === undefined ||
		current.uid !== profile.uid ||
		current.email !== profile.email ||
		current.displayName !== profile.displayName ||
		current.defaultRole !== profile.defaultRole ||
		current.activeRole !== profile.activeRole ||
		current.roles.length !== profile.roles.length ||
		current.roles.some((role, index) => role !== profile.roles[index]);

	return { profile, changed };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
	if (!db) {
		throw new Error('Firestore is not configured');
	}

	const ref = doc(db, 'users', user.uid);
	const snapshot = await getDoc(ref);

	if (snapshot.exists()) {
		const existing = snapshot.data() as UserProfile;
		const { profile, changed } = normalizeProfile(user, existing);
		if (changed) {
			await setDoc(ref, profile, { merge: true });
		}
		return profile;
	}

	const { profile } = normalizeProfile(user);

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

function fallbackProfile(user: User): UserProfile {
	const { profile } = normalizeProfile(user);
	return profile;
}

if (browser && auth) {
	onAuthStateChanged(auth, async (user) => {
		authUser.set(user);
		if (user) {
			try {
				userProfile.set(await ensureUserProfile(user));
			} catch (error) {
				console.error('Failed to load user profile; using defaults.', error);
				userProfile.set(fallbackProfile(user));
			}
		} else {
			userProfile.set(null);
		}
		authLoading.set(false);
	});
}
