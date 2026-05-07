import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	updateDoc,
	where
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { DesignCategory, DesignItem } from '$lib/types/domain';

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

export async function listDesignCategories(): Promise<DesignCategory[]> {
	const store = requireDb();
	const snapshot = await getDocs(collection(store, 'designCategories'));
	return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<DesignCategory, 'id'>) }));
}

export async function listPublishedDesigns(categoryId?: string): Promise<DesignItem[]> {
	const constraints = [where('status', '==', 'published')];
	if (categoryId) constraints.push(where('categoryId', '==', categoryId));
	const store = requireDb();
	const snapshot = await getDocs(query(collection(store, 'designItems'), ...constraints));
	return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<DesignItem, 'id'>) }));
}

export async function getDesignById(id: string): Promise<DesignItem | null> {
	const store = requireDb();
	const snapshot = await getDoc(doc(store, 'designItems', id));
	return snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Omit<DesignItem, 'id'>) }) : null;
}

export async function listDesignerDesigns(designerId: string): Promise<DesignItem[]> {
	const snapshot = await getDocs(
		query(collection(requireDb(), 'designItems'), where('designerId', '==', designerId))
	);
	const items = snapshot.docs.map((item) => ({
		id: item.id,
		...(item.data() as Omit<DesignItem, 'id'>)
	}));
	items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	return items;
}

export async function createDesignItem(payload: Omit<DesignItem, 'id'>): Promise<string> {
	const ref = await addDoc(collection(requireDb(), 'designItems'), payload);
	return ref.id;
}

export async function updateDesignItem(id: string, payload: Partial<Omit<DesignItem, 'id'>>): Promise<void> {
	await updateDoc(doc(requireDb(), 'designItems', id), payload);
}
