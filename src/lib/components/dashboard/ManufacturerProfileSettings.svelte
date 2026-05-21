<script lang="ts">
	import { onMount } from 'svelte';
	import { listDesignCategories, listDesignSubcategories } from '$lib/services/designs';
	import { formatAddressQuery, geocodeAddress } from '$lib/services/geocode';
	import {
		getManufacturerProfile,
		updateManufacturerSubscriptions,
		upsertManufacturerProfile
	} from '$lib/services/manufacturers';
	import type {
		DesignCategory,
		DesignSubcategory,
		ManufacturerProfile
	} from '$lib/types/domain';

	interface Props {
		manufacturerId: string;
		initialProfile?: ManufacturerProfile | null;
		onSaved?: () => void;
	}

	let { manufacturerId, initialProfile = null, onSaved }: Props = $props();

	let categories = $state<DesignCategory[]>([]);
	let subcategories = $state<DesignSubcategory[]>([]);
	let subscriptionCategoryId = $state('');

	let businessName = $state('');
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let postalCode = $state('');
	let country = $state('');
	let isAvailable = $state(true);

	let latitude = $state<number | null>(null);
	let longitude = $state<number | null>(null);
	let locationLabel = $state('');

	let subscribedCategoryIds = $state<string[]>([]);
	let subscribedSubcategoryIds = $state<string[]>([]);

	let busy = $state(false);
	let geocoding = $state(false);
	let notice = $state('');
	let errorMessage = $state('');

	const filteredSubcategories = $derived(
		subscriptionCategoryId
			? subcategories.filter((item) => item.categoryId === subscriptionCategoryId)
			: subcategories
	);

	const subcategoryPathById = $derived.by(() => {
		const byId = new Map(subcategories.map((item) => [item.id, item]));
		const pathById = new Map<string, string>();
		const visiting = new Set<string>();

		const buildPath = (id: string): string => {
			const cached = pathById.get(id);
			if (cached) return cached;
			const node = byId.get(id);
			if (!node) return id;
			if (visiting.has(id)) return node.name;

			visiting.add(id);
			const parentId = node.parentSubcategoryId?.trim();
			const parentPath = parentId && byId.has(parentId) ? `${buildPath(parentId)} / ` : '';
			const label = `${parentPath}${node.name}`;
			visiting.delete(id);
			pathById.set(id, label);
			return label;
		};

		for (const subcategory of subcategories) {
			buildPath(subcategory.id);
		}

		return pathById;
	});

	const mapHref = $derived(
		latitude != null && longitude != null
			? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=14/${latitude}/${longitude}`
			: ''
	);

	function applyProfile(profile: ManufacturerProfile | null): void {
		businessName = profile?.businessName ?? '';
		addressLine1 = profile?.addressLine1 ?? '';
		addressLine2 = profile?.addressLine2 ?? '';
		city = profile?.city ?? '';
		postalCode = profile?.postalCode ?? '';
		country = profile?.country ?? '';
		isAvailable = profile?.isAvailable ?? true;
		latitude = profile?.location?.latitude ?? null;
		longitude = profile?.location?.longitude ?? null;
		locationLabel = profile?.location?.label ?? '';
		subscribedCategoryIds = [...(profile?.subscribedCategoryIds ?? [])];
		subscribedSubcategoryIds = [...(profile?.subscribedSubcategoryIds ?? [])];
	}

	async function loadTaxonomy(): Promise<void> {
		const [categoryRows, subcategoryRows] = await Promise.all([
			listDesignCategories(),
			listDesignSubcategories()
		]);
		categories = categoryRows;
		subcategories = subcategoryRows;
	}

	onMount(async () => {
		try {
			busy = true;
			errorMessage = '';
			await loadTaxonomy();
			const profile = initialProfile ?? (await getManufacturerProfile(manufacturerId));
			applyProfile(profile);
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to load profile settings.';
		} finally {
			busy = false;
		}
	});

	async function locateFromAddress(): Promise<void> {
		const query = formatAddressQuery({
			addressLine1,
			addressLine2,
			postalCode,
			city,
			country
		});
		try {
			geocoding = true;
			errorMessage = '';
			notice = '';
			const result = await geocodeAddress(query);
			latitude = result.latitude;
			longitude = result.longitude;
			locationLabel = result.label;
			if (result.city && !city.trim()) {
				city = result.city;
			}
			notice = 'Location updated from your address.';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Could not locate this address.';
		} finally {
			geocoding = false;
		}
	}

	async function saveProfile(): Promise<void> {
		if (latitude == null || longitude == null) {
			errorMessage = 'Locate your business on the map before saving (use “Find on map”).';
			return;
		}
		try {
			busy = true;
			errorMessage = '';
			notice = '';
			await upsertManufacturerProfile({
				id: manufacturerId,
				businessName: businessName.trim(),
				addressLine1: addressLine1.trim() || undefined,
				addressLine2: addressLine2.trim() || undefined,
				city: city.trim(),
				postalCode: postalCode.trim() || undefined,
				country: country.trim() || undefined,
				location: {
					latitude,
					longitude,
					label: locationLabel.trim() || undefined
				},
				isAvailable
			});
			await updateManufacturerSubscriptions(manufacturerId, {
				categoryIds: subscribedCategoryIds,
				subcategoryIds: subscribedSubcategoryIds
			});
			notice = 'Profile settings saved.';
			onSaved?.();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to save profile settings.';
		} finally {
			busy = false;
		}
	}

	async function toggleCategorySubscription(categoryId: string): Promise<void> {
		const has = subscribedCategoryIds.includes(categoryId);
		const nextCategories = has
			? subscribedCategoryIds.filter((id) => id !== categoryId)
			: [...subscribedCategoryIds, categoryId];
		const allowedSubIds = new Set(
			subcategories.filter((item) => nextCategories.includes(item.categoryId)).map((item) => item.id)
		);
		subscribedCategoryIds = nextCategories;
		subscribedSubcategoryIds = subscribedSubcategoryIds.filter((id) => allowedSubIds.has(id));
	}

	async function toggleSubcategorySubscription(subcategoryId: string): Promise<void> {
		const has = subscribedSubcategoryIds.includes(subcategoryId);
		subscribedSubcategoryIds = has
			? subscribedSubcategoryIds.filter((id) => id !== subcategoryId)
			: [...subscribedSubcategoryIds, subcategoryId];
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-2xl font-bold">Profile settings</h2>
		<p class="text-sm text-base-content/70 mt-1">
			Set your business location and choose which categories and sub-categories you can deliver for
			customers.
		</p>
	</div>

	{#if errorMessage}
		<div class="alert alert-error text-sm py-2">
			<span>{errorMessage}</span>
		</div>
	{/if}
	{#if notice}
		<div class="alert alert-success text-sm py-2">
			<span>{notice}</span>
		</div>
	{/if}

	<form
		class="space-y-4"
		onsubmit={(e) => {
			e.preventDefault();
			void saveProfile();
		}}
	>
		<div class="card bg-base-100 border border-base-300">
			<div class="card-body gap-3">
				<h3 class="font-semibold">Business</h3>
				<label class="form-control w-full">
					<div class="label"><span class="label-text">Business name</span></div>
					<input
						class="input input-bordered"
						bind:value={businessName}
						required
						disabled={busy}
					/>
				</label>
				<label class="label cursor-pointer justify-start gap-2">
					<input class="toggle toggle-primary" type="checkbox" bind:checked={isAvailable} disabled={busy} />
					<span class="label-text">Available for new customer orders</span>
				</label>
			</div>
		</div>

		<div class="card bg-base-100 border border-base-300">
			<div class="card-body gap-3">
				<h3 class="font-semibold">Address &amp; location</h3>
				<div class="grid gap-3 md:grid-cols-2">
					<label class="form-control md:col-span-2">
						<div class="label"><span class="label-text">Street address</span></div>
						<input
							class="input input-bordered"
							bind:value={addressLine1}
							placeholder="Street and number"
							required
							disabled={busy}
						/>
					</label>
					<label class="form-control md:col-span-2">
						<div class="label"><span class="label-text">Address line 2 (optional)</span></div>
						<input
							class="input input-bordered"
							bind:value={addressLine2}
							placeholder="Suite, unit, etc."
							disabled={busy}
						/>
					</label>
					<label class="form-control">
						<div class="label"><span class="label-text">City</span></div>
						<input class="input input-bordered" bind:value={city} required disabled={busy} />
					</label>
					<label class="form-control">
						<div class="label"><span class="label-text">Postal code</span></div>
						<input class="input input-bordered" bind:value={postalCode} disabled={busy} />
					</label>
					<label class="form-control md:col-span-2">
						<div class="label"><span class="label-text">Country</span></div>
						<input class="input input-bordered" bind:value={country} required disabled={busy} />
					</label>
				</div>
				<div class="flex flex-wrap gap-2 items-center">
					<button
						type="button"
						class="btn btn-outline btn-sm"
						class:loading={geocoding}
						disabled={busy || geocoding}
						onclick={() => void locateFromAddress()}
					>
						Find on map
					</button>
					{#if latitude != null && longitude != null}
						<span class="text-sm text-base-content/70 font-mono">
							{latitude.toFixed(5)}, {longitude.toFixed(5)}
						</span>
						{#if mapHref}
							<a class="link link-primary text-sm" href={mapHref} target="_blank" rel="noreferrer">
								Open in map
							</a>
						{/if}
					{:else}
						<span class="text-sm text-warning">Location not set yet</span>
					{/if}
				</div>
				{#if locationLabel}
					<p class="text-xs text-base-content/60">{locationLabel}</p>
				{/if}
			</div>
		</div>

		<div class="card bg-base-100 border border-base-300">
			<div class="card-body gap-3">
				<h3 class="font-semibold">Delivery capabilities</h3>
				<p class="text-sm text-base-content/70">
					Subscribe to categories and sub-categories you can manufacture and deliver. Customers can
					discover you for matching product types.
				</p>
				<div class="flex flex-wrap gap-2">
					{#each categories as cat (cat.id)}
						<button
							type="button"
							class="btn btn-xs"
							class:btn-primary={subscribedCategoryIds.includes(cat.id)}
							class:btn-outline={!subscribedCategoryIds.includes(cat.id)}
							disabled={busy}
							onclick={() => void toggleCategorySubscription(cat.id)}
						>
							{subscribedCategoryIds.includes(cat.id) ? 'Delivering' : 'Add'}: {cat.name}
						</button>
					{/each}
				</div>
				<label class="form-control max-w-md">
					<div class="label"><span class="label-text">Refine by sub-category</span></div>
					<select
						class="select select-bordered select-sm"
						bind:value={subscriptionCategoryId}
						disabled={busy}
					>
						<option value="">Choose a category</option>
						{#each categories as cat (cat.id)}
							<option value={cat.id} disabled={!subscribedCategoryIds.includes(cat.id)}>
								{cat.name}
							</option>
						{/each}
					</select>
				</label>
				{#if subscriptionCategoryId}
					<div class="flex flex-wrap gap-2">
						{#each filteredSubcategories as sub (sub.id)}
							<button
								type="button"
								class="btn btn-xs"
								class:btn-secondary={subscribedSubcategoryIds.includes(sub.id)}
								class:btn-ghost={!subscribedSubcategoryIds.includes(sub.id)}
								disabled={busy || !subscribedCategoryIds.includes(sub.categoryId)}
								onclick={() => void toggleSubcategorySubscription(sub.id)}
							>
								{subscribedSubcategoryIds.includes(sub.id) ? 'Delivering' : 'Add'}:
								{subcategoryPathById.get(sub.id) ?? sub.name}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button type="submit" class="btn btn-primary" class:loading={busy} disabled={busy}>
				Save profile settings
			</button>
			<a class="btn btn-ghost" href="/dashboard/manufacturer">Back to dashboard</a>
		</div>
	</form>
</div>
