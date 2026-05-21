import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface NominatimResult {
	lat: string;
	lon: string;
	display_name: string;
	address?: {
		city?: string;
		town?: string;
		village?: string;
		municipality?: string;
	};
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) {
		return json({ message: 'Missing address query.' }, { status: 400 });
	}

	const params = new URLSearchParams({
		q,
		format: 'json',
		limit: '1',
		addressdetails: '1'
	});

	const response = await fetch(`${NOMINATIM_URL}?${params}`, {
		headers: {
			'User-Agent': 'Diseyn Marketplace (manufacturer profile geocoding)'
		}
	});

	if (!response.ok) {
		return json({ message: 'Geocoding service unavailable.' }, { status: 502 });
	}

	const results = (await response.json()) as NominatimResult[];
	const hit = results[0];
	if (!hit) {
		return json({ message: 'No location found for this address.' }, { status: 404 });
	}

	const latitude = Number(hit.lat);
	const longitude = Number(hit.lon);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ message: 'Invalid geocoding response.' }, { status: 502 });
	}

	const city =
		hit.address?.city ??
		hit.address?.town ??
		hit.address?.village ??
		hit.address?.municipality;

	return json({
		latitude,
		longitude,
		label: hit.display_name,
		city
	});
};
