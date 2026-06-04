/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;
const CACHE = `diseyn-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(ASSETS);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
		})()
	);
});

function isDocumentRequest(request: Request): boolean {
	return (
		request.mode === 'navigate' ||
		(request.headers.get('accept') ?? '').includes('text/html')
	);
}

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	// Always fetch HTML navigations from the network so new routes and UI ship immediately.
	if (isDocumentRequest(event.request)) {
		event.respondWith(fetch(event.request));
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(event.request);
			if (cached) return cached;

			try {
				const response = await fetch(event.request);
				if (response.ok) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				const fallback = await cache.match('/offline');
				if (fallback) return fallback;
				throw new Error('Network unavailable and no cache entry found');
			}
		})()
	);
});
