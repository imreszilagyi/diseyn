<script lang="ts">
	import '../app.css';
	import { userProfile } from '$lib/stores/auth';
</script>

<div class="min-h-screen bg-base-200">
	<div class="navbar bg-base-100 border-b border-base-300">
		<div class="container mx-auto">
			<div class="flex-1">
				<a href="/" class="btn btn-ghost text-lg">Diseyn</a>
			</div>
			<div class="flex-none gap-2 flex-wrap justify-end">
				<a href="/" class="btn btn-ghost btn-sm">Home</a>
				<a href="/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
				{#if $userProfile?.roles?.includes('manufacturer')}
					<a href="/dashboard/manufacturer/settings" class="btn btn-ghost btn-sm">Contractor settings</a>
				{/if}
				<a href="/auth" class="btn btn-ghost btn-sm">Auth</a>
				{#if $userProfile}
					<div class="badge badge-primary">{($userProfile.activeRole || 'customer').toUpperCase()}</div>
				{/if}
			</div>
		</div>
	</div>

	<main class="container mx-auto p-4 md:p-6">
		<slot />
	</main>
</div>
