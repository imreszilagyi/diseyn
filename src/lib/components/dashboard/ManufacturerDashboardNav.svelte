<script lang="ts">
	import { page } from '$app/stores';

	const pathname = $derived.by(() => $page.url.pathname);
	const isSettings = $derived(
		pathname === '/dashboard/manufacturer' || pathname.startsWith('/dashboard/manufacturer/settings')
	);
	const isCatalog = $derived(pathname.startsWith('/dashboard/manufacturer/catalog'));
</script>

<nav aria-label="Contractor dashboard" class="mb-4">
	<div role="tablist" class="tabs tabs-box tabs-sm w-full max-w-md">
		<a
			role="tab"
			href="/dashboard/manufacturer/catalog"
			class="tab"
			class:tab-active={isCatalog}
			aria-current={isCatalog ? 'page' : undefined}
		>
			Catalog
		</a>
		<a
			role="tab"
			href="/dashboard/manufacturer"
			class="tab"
			class:tab-active={isSettings}
			aria-current={isSettings ? 'page' : undefined}
		>
			Profile settings
		</a>
	</div>
</nav>
