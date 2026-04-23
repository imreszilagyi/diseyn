import {
	addDoc,
	collection,
	doc,
	getDocs,
	orderBy,
	query,
	updateDoc,
	where
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { Order, OrderStatus } from '$lib/types/domain';

function requireDb() {
	if (!db) throw new Error('Firestore is not configured');
	return db;
}

export async function createOrder(payload: Omit<Order, 'id'>): Promise<string> {
	const ref = await addDoc(collection(requireDb(), 'orders'), payload);
	return ref.id;
}

export async function listCustomerOrders(customerId: string): Promise<Order[]> {
	const snapshot = await getDocs(
		query(
			collection(requireDb(), 'orders'),
			where('customerId', '==', customerId),
			orderBy('createdAt', 'desc')
		)
	);
	return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Order, 'id'>) }));
}

export async function listManufacturerOrders(manufacturerId: string): Promise<Order[]> {
	const snapshot = await getDocs(
		query(
			collection(requireDb(), 'orders'),
			where('selectedManufacturerId', '==', manufacturerId),
			orderBy('createdAt', 'desc')
		)
	);
	return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Order, 'id'>) }));
}

export async function updateOrderStatus(
	orderId: string,
	status: OrderStatus,
	event: { status: OrderStatus; at: string }
): Promise<void> {
	await updateDoc(doc(requireDb(), 'orders', orderId), {
		status
	});
	await addDoc(collection(requireDb(), 'orders', orderId, 'orderEvents'), event);
}
