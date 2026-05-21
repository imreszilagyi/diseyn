<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import ManufacturerProfileSettings from '$lib/components/dashboard/ManufacturerProfileSettings.svelte';
	import { getManufacturerProfile } from '$lib/services/manufacturers';
	import { authLoading, authUser, userProfile } from '$lib/stores/auth';
	import type { ManufacturerProfile, UserRole } from '$lib/types/domain';

	const routeRole = $derived(($page.params.role as UserRole) || '');
	const allowedRoles = $derived(($userProfile?.roles ?? []) as UserRole[]);
	const isAuthorized = $derived(allowedRoles.includes(routeRole));

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
		const role = (get(page).params.role as UserRole) || '';
		if (!user || !profile) {
			loadingProfile = false;
			return;
		}
		if (role !== 'manufacturer') {
			loadingProfile = false;
			return;
		}
		if (!profile.roles.includes(role)) {
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

<div class="space-y-4">
	{#if !$authUser}
		<div class="alert alert-warning">
			<span>You must sign in first.</span>
			<a class="btn btn-sm btn-primary" href="/auth">Go to auth</a>
		</div>
	{:else if routeRole !== 'manufacturer'}
		<div class="alert alert-info">
			<span>Profile settings are only available for the contractor (manufacturer) role.</span>
			<a class="btn btn-sm btn-ghost" href={`/dashboard/${routeRole}`}>Back to dashboard</a>
		</div>
	{:else if !isAuthorized}
		<div class="alert alert-error">
			<span>You do not have access to the manufacturer dashboard.</span>
			{#each allowedRoles as role (role)}
				<a class="btn btn-sm btn-outline" href={`/dashboard/${role}`}>Go to {role}</a>
			{/each}
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
