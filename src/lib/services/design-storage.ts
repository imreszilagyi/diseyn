import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '$lib/firebase/client';

function requireStorage() {
	if (!storage) throw new Error('Firebase Storage is not configured');
	return storage;
}

/**
 * Uploads under `designs/{designerId}/...` per storage.rules.
 */
export async function uploadDesignConceptImage(
	designerId: string,
	designId: string,
	file: File
): Promise<string> {
	const safeName = file.name.replace(/[^\w.\-]/g, '_');
	const path = `designs/${designerId}/${designId}/${Date.now()}_${safeName}`;
	const objectRef = ref(requireStorage(), path);
	await uploadBytes(objectRef, file, { contentType: file.type || undefined });
	return getDownloadURL(objectRef);
}
