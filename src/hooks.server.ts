import type { Handle } from '@sveltejs/kit';

/**
 * Firebase `signInWithPopup` polls the OAuth window’s `closed` state. A strict
 * `Cross-Origin-Opener-Policy: same-origin` (common default) blocks that and
 * logs console warnings. `same-origin-allow-popups` keeps isolation while
 * allowing the opener ↔ popup relationship OAuth popups need.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	return response;
};
