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
	createdBy?: string;
	createdAt?: string;
}

export interface DesignSubcategory {
	id: string;
	categoryId: string;
	name: string;
	slug: string;
	description?: string;
	createdBy?: string;
	createdAt?: string;
}

export interface DesignCharacteristic {
	key: string;
	value: string;
}

export interface DesignItem {
	id: string;
	title: string;
	description: string;
	categoryId: string;
	subcategoryIds?: string[];
	designerId: string;
	/** Legacy single image; prefer `imageUrls` */
	imageUrl?: string;
	imageUrls?: string[];
	characteristics?: DesignCharacteristic[];
	designType: string;
	status: 'draft' | 'published' | 'archived';
	createdAt: string;
}

export type ManufacturerDesignVerdict = 'accepted' | 'declined';

export interface ManufacturerDesignDecision {
	manufacturerId: string;
	designId: string;
	verdict: ManufacturerDesignVerdict;
	updatedAt: string;
}

export interface ManufacturerProfile {
	id: string;
	businessName: string;
	city: string;
	supportedDesignTypes: string[];
	subscribedCategoryIds?: string[];
	subscribedSubcategoryIds?: string[];
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
