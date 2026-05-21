export interface GeocodeResult {
	latitude: number;
	longitude: number;
	label: string;
	city?: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
	const trimmed = query.trim();
	if (!trimmed) {
		throw new Error('Enter an address to locate on the map.');
	}

	const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		throw new Error(body?.message ?? 'Could not geocode this address.');
	}

	return (await response.json()) as GeocodeResult;
}

export function formatAddressQuery(parts: {
	addressLine1?: string;
	addressLine2?: string;
	postalCode?: string;
	city?: string;
	country?: string;
}): string {
	return [
		parts.addressLine1,
		parts.addressLine2,
		parts.postalCode,
		parts.city,
		parts.country
	]
		.map((value) => value?.trim())
		.filter(Boolean)
		.join(', ');
}
