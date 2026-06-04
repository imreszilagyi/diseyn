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
		const unsubs = [authLoading.subscribe(run), authUser.subscribe(run), userProfile.subscribe(run)];
		return () => unsubs.forEach((u) => u());
	});

	async function initialize(): Promise<void> {
		if (get(authLoading)) return;
		const user = get(authUser);
		const profile = get(userProfile);
		if (!user || !profile) {
			loadingProfile = false;
			return;
		}
		if (!profile.roles.includes('manufacturer')) {
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
	<title>Contractor profile settings · Diseyn</title>
</svelte:head>

<div class="space-y-4">
	{#if !$authUser}
		<div class="alert alert-warning">
			<span>You must sign in first.</span>
			<a class="btn btn-sm btn-primary" href="/auth">Go to auth</a>
		</div>
	{:else if loadingProfile}
		<div class="flex justify-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<ManufacturerProfileSettings
			manufacturerId={$authUser.uid}
			initialProfile={manufacturerProfile}
			onSaved={() => {
				void initialize();
			}}
		/>
	{/if}
</div>
