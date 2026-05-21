import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Prefer the static manufacturer settings route (avoids dynamic-route edge cases). */
export const load: PageLoad = ({ params }) => {
	if (params.role === 'manufacturer') {
		redirect(308, '/dashboard/manufacturer/settings');
	}
};
