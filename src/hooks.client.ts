import { browser } from '$app/environment';

/** Stale SW caches can hide new routes/UI; clear registrations on each load until cache strategy is tightened. */
if (browser && 'serviceWorker' in navigator) {
	void navigator.serviceWorker.getRegistrations().then((registrations) => {
		for (const registration of registrations) {
			void registration.unregister();
		}
	});
}
