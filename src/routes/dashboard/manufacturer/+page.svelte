<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import ManufacturerProfileSettings from '$lib/components/dashboard/ManufacturerProfileSettings.svelte';
	import { getManufacturerProfile } from '$lib/services/manufacturers';
	import { authLoading, authUser, userProfile } from '$lib/stores/auth';
	import type { ManufacturerProfile } from '$lib/types/domain';

	let manufacturerProfile = $state<ManufacturerProfile | null>(null);
	let loadingProfile = $state(true);

	onMount(() => {
		const run = () => void initialize();
		run();
		const unsubs = [authLoading.subscribe(run), authUser.subscribe(run)];
		return () => unsubs.forEach((u) => u());
	});

	async function initialize(): Promise<void> {
		if (get(authLoading)) return;
		const user = get(authUser);
		if (!user) {
			loadingProfile = false;
			return;
		}
		try {
			loadingProfile = true;
			manufacturerProfile = await getManufacturerProfile(user.uid);
		} finally {
			loadingProfile = false;
		}
	}
</script>

<svelte:head>
	<title>Contractor profile · Diseyn</title>
</svelte:head>

{#if $authLoading}
	<div class="flex justify-center py-12">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if !$authUser}
	<div class="alert alert-warning">
		<span>Sign in to manage your contractor profile.</span>
		<a class="btn btn-sm btn-primary" href="/auth">Go to auth</a>
	</div>
{:else if !$userProfile?.roles?.includes('manufacturer')}
	<div class="alert alert-error">
		<span>Your account does not include the contractor (manufacturer) role.</span>
		<a class="btn btn-sm btn-ghost" href="/dashboard">Back to dashboard</a>
	</div>
{:else if loadingProfile}
	<div class="flex justify-center py-12">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else}
	{#if ($userProfile?.roles?.length ?? 0) > 1}
		<div class="alert alert-info text-sm py-2">
			<span>
				You have multiple roles
				({($userProfile?.roles ?? []).join(', ')}). Contractor profile is shared — switch roles freely
				on the <a class="link" href="/dashboard">dashboard</a>.
			</span>
		</div>
	{/if}
	<ManufacturerProfileSettings
		manufacturerId={$authUser.uid}
		initialProfile={manufacturerProfile}
		onSaved={() => {
			void initialize();
		}}
	/>
{/if}
