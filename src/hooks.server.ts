import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

/**
 * Firebase `signInWithPopup` polls the OAuth window’s `closed` state. A strict
 * `Cross-Origin-Opener-Policy: same-origin` (common default) blocks that and
 * logs console warnings. `same-origin-allow-popups` keeps isolation while
 * allowing the opener ↔ popup relationship OAuth popups need.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: dev
			? ({ html }) => html.replace(/\s*<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>\s*/i, '')
			: undefined
	});
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	return response;
};
