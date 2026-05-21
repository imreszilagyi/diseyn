import { collection, getDoc, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { ManufacturerLocation, ManufacturerProfile } from '$lib/types/domain';

export type ManufacturerProfileUpdate = Partial<
	Omit<ManufacturerProfile, 'id' | 'subscribedCategoryIds' | 'subscribedSubcategoryIds'>
> & {
	id: string;
	subscribedCategoryIds?: string[];
	subscribedSubcategoryIds?: string[];
};

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

export async function listAvailableManufacturers(city?: string): Promise<ManufacturerProfile[]> {
	const constraints = [where('isAvailable', '==', true)];
	if (city) constraints.push(where('city', '==', city));
	const snapshot = await getDocs(query(collection(requireDb(), 'manufacturers'), ...constraints));
	return snapshot.docs.map((item) => ({
		id: item.id,
		...(item.data() as Omit<ManufacturerProfile, 'id'>)
	}));
}

function locationEqual(a?: ManufacturerLocation, b?: ManufacturerLocation): boolean {
	if (!a && !b) return true;
	if (!a || !b) return false;
	return (
		a.latitude === b.latitude &&
		a.longitude === b.longitude &&
		(a.label ?? '') === (b.label ?? '')
	);
}

function profilePatchChanged(
	current: ManufacturerProfile | null,
	patch: ManufacturerProfileUpdate
): boolean {
	if (!current) return true;
	const keys = Object.keys(patch).filter((key) => key !== 'id') as (keyof ManufacturerProfileUpdate)[];
	for (const key of keys) {
		if (key === 'location') {
			if (!locationEqual(current.location, patch.location)) return true;
			continue;
		}
		if (JSON.stringify(current[key]) !== JSON.stringify(patch[key])) return true;
	}
	return false;
}

export async function upsertManufacturerProfile(payload: ManufacturerProfileUpdate): Promise<void> {
	const current = await getManufacturerProfile(payload.id);
	if (!profilePatchChanged(current, payload)) return;

	await setDoc(
		doc(requireDb(), 'manufacturers', payload.id),
		{
			...payload,
			updatedAt: new Date().toISOString()
		},
		{ merge: true }
	);
}

export async function getManufacturerProfile(id: string): Promise<ManufacturerProfile | null> {
	const snapshot = await getDoc(doc(requireDb(), 'manufacturers', id));
	if (!snapshot.exists()) return null;
	return {
		id: snapshot.id,
		...(snapshot.data() as Omit<ManufacturerProfile, 'id'>)
	};
}

function normalizeIds(values: string[]): string[] {
	return Array.from(
		new Set(
			values
				.map((value) => value.trim())
				.filter(Boolean)
		)
	).sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((value, index) => value === b[index]);
}

export async function updateManufacturerSubscriptions(
	manufacturerId: string,
	payload: { categoryIds: string[]; subcategoryIds: string[] }
): Promise<void> {
	const current = await getManufacturerProfile(manufacturerId);
	const nextCategoryIds = normalizeIds(payload.categoryIds);
	const nextSubcategoryIds = normalizeIds(payload.subcategoryIds);
	const currentCategoryIds = normalizeIds(current?.subscribedCategoryIds ?? []);
	const currentSubcategoryIds = normalizeIds(current?.subscribedSubcategoryIds ?? []);

	if (
		arraysEqual(nextCategoryIds, currentCategoryIds) &&
		arraysEqual(nextSubcategoryIds, currentSubcategoryIds)
	) {
		return;
	}

	await setDoc(
		doc(requireDb(), 'manufacturers', manufacturerId),
		{
			subscribedCategoryIds: nextCategoryIds,
			subscribedSubcategoryIds: nextSubcategoryIds
		},
		{ merge: true }
	);
}
