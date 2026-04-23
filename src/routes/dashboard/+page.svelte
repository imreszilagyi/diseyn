<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authLoading, userProfile } from '$lib/stores/auth';

	onMount(() => {
		if ($userProfile?.activeRole) {
			void goto(`/dashboard/${$userProfile.activeRole}`);
		}
	});
</script>

{#if $authLoading}
	<div class="loading loading-spinner loading-lg"></div>
{:else if $userProfile?.activeRole}
	<div class="alert">
		<span>Redirecting to your dashboard...</span>
	</div>
{:else}
	<div class="card bg-base-100 border border-base-300 max-w-lg mx-auto">
		<div class="card-body">
			<h1 class="card-title text-2xl">Dashboard access</h1>
			<p>You need to sign in to access role dashboards.</p>
			<div class="card-actions">
				<a class="btn btn-primary" href="/auth">Go to auth</a>
			</div>
		</div>
	</div>
{/if}
