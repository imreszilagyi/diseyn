import type { UserRole } from '$lib/types/domain';

const rolePriority: UserRole[] = ['admin', 'designer', 'manufacturer', 'customer'];

export function getHighestRole(roles: UserRole[]): UserRole {
	return rolePriority.find((role) => roles.includes(role)) ?? 'customer';
}
