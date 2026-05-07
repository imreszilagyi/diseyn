import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	type QueryConstraint,
	updateDoc,
	where
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { DesignCategory, DesignItem, DesignSubcategory } from '$lib/types/domain';

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

let categoryCache: DesignCategory[] | null = null;
const subcategoryCache = new Map<string, DesignSubcategory[]>();

function normalizeDesignItem(id: string, data: Omit<DesignItem, 'id'>): DesignItem {
	return {
		id,
		...data,
		// Backward compatibility for legacy docs created before status/subcategory fields existed.
		status: (data.status ?? 'published') as DesignItem['status'],
		subcategoryIds: data.subcategoryIds ?? []
	};
}

export async function listDesignCategories(): Promise<DesignCategory[]> {
	if (categoryCache) return categoryCache;
	const store = requireDb();
	const snapshot = await getDocs(collection(store, 'designCategories'));
	categoryCache = snapshot.docs.map((item) => ({
		id: item.id,
		...(item.data() as Omit<DesignCategory, 'id'>)
	}));
	return categoryCache;
}

export interface ListPublishedDesignFilters {
	categoryId?: string;
	subcategoryId?: string;
	maxItems?: number;
}

export async function listDesignSubcategories(categoryId?: string): Promise<DesignSubcategory[]> {
	const cacheKey = categoryId || '__all__';
	const cached = subcategoryCache.get(cacheKey);
	if (cached) return cached;
	const constraints: QueryConstraint[] = [];
	if (categoryId) constraints.push(where('categoryId', '==', categoryId));
	const snapshot = await getDocs(query(collection(requireDb(), 'designSubcategories'), ...constraints));
	const results = snapshot.docs.map((item) => ({
		id: item.id,
		...(item.data() as Omit<DesignSubcategory, 'id'>)
	}));
	subcategoryCache.set(cacheKey, results);
	return results;
}

export async function createDesignCategory(payload: {
	name: string;
	description?: string;
	createdBy?: string;
}): Promise<string> {
	const name = payload.name.trim();
	if (!name) throw new Error('Category name is required.');
	const ref = await addDoc(collection(requireDb(), 'designCategories'), {
		name,
		slug: slugify(name),
		description: payload.description?.trim() || '',
		createdBy: payload.createdBy || '',
		createdAt: new Date().toISOString()
	});
	categoryCache = null;
	return ref.id;
}

export async function createDesignSubcategory(payload: {
	categoryId: string;
	name: string;
	description?: string;
	createdBy?: string;
}): Promise<string> {
	const categoryId = payload.categoryId.trim();
	const name = payload.name.trim();
	if (!categoryId) throw new Error('Category is required.');
	if (!name) throw new Error('Sub-category name is required.');
	const ref = await addDoc(collection(requireDb(), 'designSubcategories'), {
		categoryId,
		name,
		slug: slugify(name),
		description: payload.description?.trim() || '',
		createdBy: payload.createdBy || '',
		createdAt: new Date().toISOString()
	});
	subcategoryCache.delete(categoryId);
	subcategoryCache.delete('__all__');
	return ref.id;
}

async function normalizeSubcategoryIds(
	categoryId: string,
	subcategoryIds: string[] | undefined
): Promise<string[] | undefined> {
	if (!subcategoryIds) return undefined;
	const normalized = Array.from(
		new Set(
			subcategoryIds
				.map((item) => item.trim())
				.filter(Boolean)
		)
	);
	if (normalized.length === 0) return [];
	const available = await listDesignSubcategories(categoryId);
	const allowed = new Set(available.map((item) => item.id));
	return normalized.filter((item) => allowed.has(item));
}

export async function listPublishedDesigns(
	filters?: string | ListPublishedDesignFilters
): Promise<DesignItem[]> {
	const resolved =
		typeof filters === 'string' ? { categoryId: filters } : (filters ?? ({} as ListPublishedDesignFilters));
	const store = requireDb();

	const publishedConstraints: QueryConstraint[] = [where('status', '==', 'published')];
	if (resolved.categoryId) publishedConstraints.push(where('categoryId', '==', resolved.categoryId));
	if (resolved.subcategoryId)
		publishedConstraints.push(where('subcategoryIds', 'array-contains', resolved.subcategoryId));
	publishedConstraints.push(orderBy('createdAt', 'desc'));
	if (resolved.maxItems && resolved.maxItems > 0) publishedConstraints.push(limit(resolved.maxItems));

	const publishedSnapshot = await getDocs(query(collection(store, 'designItems'), ...publishedConstraints));
	if (publishedSnapshot.docs.length > 0) {
		return publishedSnapshot.docs.map((item) =>
			normalizeDesignItem(item.id, item.data() as Omit<DesignItem, 'id'>)
		);
	}

	// Fallback for legacy rows where `status` may be missing.
	const legacyConstraints: QueryConstraint[] = [];
	if (resolved.categoryId) legacyConstraints.push(where('categoryId', '==', resolved.categoryId));
	legacyConstraints.push(orderBy('createdAt', 'desc'));
	if (resolved.maxItems && resolved.maxItems > 0) legacyConstraints.push(limit(resolved.maxItems));
	const legacySnapshot = await getDocs(query(collection(store, 'designItems'), ...legacyConstraints));
	const legacy = legacySnapshot.docs
		.map((item) => normalizeDesignItem(item.id, item.data() as Omit<DesignItem, 'id'>))
		.filter((item) => !item.status || item.status === 'published');
	return resolved.subcategoryId
		? legacy.filter((item) => item.subcategoryIds?.includes(resolved.subcategoryId ?? ''))
		: legacy;
}

export async function getDesignById(id: string): Promise<DesignItem | null> {
	const store = requireDb();
	const snapshot = await getDoc(doc(store, 'designItems', id));
	return snapshot.exists()
		? normalizeDesignItem(snapshot.id, snapshot.data() as Omit<DesignItem, 'id'>)
		: null;
}

export async function listDesignerDesigns(designerId: string): Promise<DesignItem[]> {
	const id = designerId.trim();
	if (!id) return [];

	// Single-field equality: no composite index required. Sort in memory so docs
	// missing `createdAt` (legacy rows) are not excluded by orderBy.
	const snapshot = await getDocs(
		query(collection(requireDb(), 'designItems'), where('designerId', '==', id))
	);
	const items = snapshot.docs.map((docSnap) =>
		normalizeDesignItem(docSnap.id, docSnap.data() as Omit<DesignItem, 'id'>)
	);
	items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
	return items;
}

export async function createDesignItem(payload: Omit<DesignItem, 'id'>): Promise<string> {
	const designerId = payload.designerId?.trim();
	if (!designerId) {
		throw new Error('Designer is required to create a design item.');
	}
	const normalizedSubcategoryIds = await normalizeSubcategoryIds(payload.categoryId, payload.subcategoryIds);
	const ref = await addDoc(collection(requireDb(), 'designItems'), {
		...payload,
		designerId,
		subcategoryIds: normalizedSubcategoryIds ?? []
	});
	return ref.id;
}

export async function updateDesignItem(id: string, payload: Partial<Omit<DesignItem, 'id'>>): Promise<void> {
	if (Object.keys(payload).length === 0) return;

	let categoryId = payload.categoryId;
	if (!categoryId && payload.subcategoryIds !== undefined) {
		const existing = await getDesignById(id);
		categoryId = existing?.categoryId;
	}

	const data: Record<string, unknown> = { ...payload };

	if (payload.subcategoryIds !== undefined) {
		if (categoryId) {
			data.subcategoryIds = await normalizeSubcategoryIds(categoryId, payload.subcategoryIds);
		} else {
			delete data.subcategoryIds;
		}
	}

	await updateDoc(doc(requireDb(), 'designItems', id), data as Partial<Omit<DesignItem, 'id'>>);
}
