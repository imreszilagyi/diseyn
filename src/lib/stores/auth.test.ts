import { describe, expect, it } from 'vitest';
import { getHighestRole } from '$lib/utils/roles';

describe('getHighestRole', () => {
	it('prioritizes admin over all other roles', () => {
		expect(getHighestRole(['customer', 'admin'])).toBe('admin');
	});

	it('falls back to customer when no known roles exist', () => {
		expect(getHighestRole([])).toBe('customer');
	});
});
