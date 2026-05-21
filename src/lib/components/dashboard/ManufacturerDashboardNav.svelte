<script lang="ts">
	import { page } from '$app/state';

	const isSettings = $derived(page.url.pathname.startsWith('/dashboard/manufacturer/settings'));
</script>

<nav aria-label="Contractor dashboard" class="mb-4">
	<div role="tablist" class="tabs tabs-box tabs-sm w-full max-w-md">
		<a
			role="tab"
			href="/dashboard/manufacturer"
			class="tab"
			class:tab-active={!isSettings}
			aria-current={isSettings ? undefined : 'page'}
		>
			Dashboard
		</a>
		<a
			role="tab"
			href="/dashboard/manufacturer/settings"
			class="tab"
			class:tab-active={isSettings}
			aria-current={isSettings ? 'page' : undefined}
		>
			Profile settings
		</a>
	</div>
</nav>
