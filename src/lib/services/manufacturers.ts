import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
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
