import { dev } from '$app/environment';

if (dev && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
	void navigator.serviceWorker.getRegistrations().then((registrations) => {
		for (const registration of registrations) {
			void registration.unregister();
		}
	});
}
