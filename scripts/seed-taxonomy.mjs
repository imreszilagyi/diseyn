import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

function getPrivateKey() {
	return requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n');
}

function slugify(value) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function getAdminDb() {
	const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID');
	const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
	const privateKey = getPrivateKey();

	const app =
		getApps()[0] ??
		initializeApp({
			credential: cert({ projectId, clientEmail, privateKey }),
			projectId
		});
	return getFirestore(app);
}

async function upsertCategory(db, payload) {
	const id = payload.id;
	const now = new Date().toISOString();
	const ref = db.collection('designCategories').doc(id);
	const snapshot = await ref.get();
	const base = {
		name: payload.name,
		slug: slugify(payload.name),
		description: payload.description || '',
		createdBy: 'system-taxonomy-seed'
	};
	if (snapshot.exists) {
		await ref.set(base, { merge: true });
		return id;
	}
	await ref.set({ ...base, createdAt: now });
	return id;
}

async function upsertSubcategory(db, payload) {
	const id = payload.id;
	const now = new Date().toISOString();
	const ref = db.collection('designSubcategories').doc(id);
	const snapshot = await ref.get();
	const base = {
		categoryId: payload.categoryId,
		parentSubcategoryId: payload.parentSubcategoryId ?? null,
		name: payload.name,
		slug: slugify(payload.name),
		description: payload.description || '',
		createdBy: 'system-taxonomy-seed'
	};
	if (snapshot.exists) {
		await ref.set(base, { merge: true });
		return id;
	}
	await ref.set({ ...base, createdAt: now });
	return id;
}

async function assignOakDinnerTaxonomy(db, homeLivingId, diningRoomId) {
	const designsRef = db.collection('designItems');
	const snapshot = await designsRef.where('title', 'in', ['Oak Dinner tabe', 'Oak Dinner table']).get();
	if (snapshot.empty) {
		console.log('No "Oak Dinner tabe/table" design found. Skipping design assignment.');
		return;
	}

	const updates = snapshot.docs.map(async (docSnap) => {
		const existing = docSnap.data();
		const existingSubcategories = Array.isArray(existing.subcategoryIds)
			? existing.subcategoryIds.map((item) => String(item))
			: [];
		const nextSubcategoryIds = Array.from(new Set([...existingSubcategories, diningRoomId]));
		await docSnap.ref.set(
			{
				categoryId: homeLivingId,
				subcategoryIds: nextSubcategoryIds
			},
			{ merge: true }
		);
	});
	await Promise.all(updates);
	console.log(`Assigned taxonomy for ${updates.length} Oak Dinner design item(s).`);
}

async function main() {
	const db = getAdminDb();

	const clothingId = await upsertCategory(db, {
		id: 'clothing',
		name: 'Clothing'
	});
	const homeLivingId = await upsertCategory(db, {
		id: 'home-living',
		name: 'Home & Living'
	});
	const jewelleryId = await upsertCategory(db, {
		id: 'jewellery',
		name: 'Jewellery'
	});

	await upsertSubcategory(db, {
		id: 'home-living--furniture',
		categoryId: homeLivingId,
		name: 'Furniture'
	});
	const diningRoomId = await upsertSubcategory(db, {
		id: 'home-living--furniture--dining-room',
		categoryId: homeLivingId,
		parentSubcategoryId: 'home-living--furniture',
		name: 'Dining Room'
	});

	await assignOakDinnerTaxonomy(db, homeLivingId, diningRoomId);

	console.log(
		`Taxonomy seed complete. Categories: ${clothingId}, ${homeLivingId}, ${jewelleryId}; path: Home & Living/Furniture/Dining Room`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
