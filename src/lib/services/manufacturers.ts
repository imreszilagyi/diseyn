import { collection, getDoc, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { ManufacturerProfile } from '$lib/types/domain';

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

export async function upsertManufacturerProfile(payload: ManufacturerProfile): Promise<void> {
	await setDoc(doc(requireDb(), 'manufacturers', payload.id), payload, { merge: true });
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
