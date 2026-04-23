export type UserRole = 'customer' | 'manufacturer' | 'designer' | 'admin';

export interface UserProfile {
	uid: string;
	email: string | null;
	displayName: string | null;
	roles: UserRole[];
	defaultRole: UserRole;
	activeRole: UserRole;
}

export interface DesignCategory {
	id: string;
	name: string;
	slug: string;
	description?: string;
}

export interface DesignItem {
	id: string;
	title: string;
	description: string;
	categoryId: string;
	designerId: string;
	imageUrl?: string;
	designType: string;
	status: 'draft' | 'published' | 'archived';
	createdAt: string;
}

export interface ManufacturerProfile {
	id: string;
	businessName: string;
	city: string;
	supportedDesignTypes: string[];
	isAvailable: boolean;
}

export type OrderStatus =
	| 'placed'
	| 'accepted'
	| 'in_production'
	| 'ready'
	| 'completed';

export interface Order {
	id: string;
	customerId: string;
	designId: string;
	selectedManufacturerId: string;
	status: OrderStatus;
	timeline: { status: OrderStatus; at: string }[];
	createdAt: string;
}
