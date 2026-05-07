import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { ManufacturerDesignDecision, ManufacturerDesignVerdict } from '$lib/types/domain';

const COLLECTION = 'manufacturerDesignDecisions';

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

export function manufacturerDesignDecisionDocId(manufacturerId: string, designId: string): string {
	return `${manufacturerId}__${designId}`;
}

export async function setManufacturerDesignDecision(
	manufacturerId: string,
	designId: string,
	verdict: ManufacturerDesignVerdict
): Promise<void> {
	const payload: ManufacturerDesignDecision = {
		manufacturerId,
		designId,
		verdict,
		updatedAt: new Date().toISOString()
	};
	await setDoc(
		doc(requireDb(), COLLECTION, manufacturerDesignDecisionDocId(manufacturerId, designId)),
		payload,
		{ merge: true }
	);
}

/** All decisions by this contractor (typically small). */
export async function listDecisionsForManufacturer(
	manufacturerId: string
): Promise<Map<string, ManufacturerDesignVerdict>> {
	const snapshot = await getDocs(
		query(collection(requireDb(), COLLECTION), where('manufacturerId', '==', manufacturerId))
	);
	const map = new Map<string, ManufacturerDesignVerdict>();
	for (const d of snapshot.docs) {
		const data = d.data() as ManufacturerDesignDecision;
		map.set(data.designId, data.verdict);
	}
	return map;
}
