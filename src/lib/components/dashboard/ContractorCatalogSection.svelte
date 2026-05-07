<script lang="ts">
	import { onMount } from 'svelte';
	import { listDesignCategories, listDesignSubcategories, listPublishedDesigns } from '$lib/services/designs';
	import {
		getManufacturerProfile,
		updateManufacturerSubscriptions
	} from '$lib/services/manufacturers';
	import {
		listDecisionsForManufacturer,
		setManufacturerDesignDecision
	} from '$lib/services/manufacturer-design-decisions';
	import type {
		DesignCategory,
		DesignItem,
		DesignSubcategory,
		ManufacturerDesignVerdict,
		ManufacturerProfile
	} from '$lib/types/domain';
	import { designCoverImageUrl } from '$lib/utils/design-media';

	export let manufacturerId: string;
	export let initialProfile: ManufacturerProfile | null = null;

	let categories: DesignCategory[] = [];
	let subcategories: DesignSubcategory[] = [];
	let selectedCategoryId = '';
	let selectedSubcategoryId = '';
	let catalogDesigns: DesignItem[] = [];
	let decisions = new Map<string, ManufacturerDesignVerdict>();
	let subscribedCategoryIds: string[] = [];
	let subscribedSubcategoryIds: string[] = [];
	let busy = false;
	let notice = '';

	async function loadDecisions() {
		decisions = await listDecisionsForManufacturer(manufacturerId);
	}

	async function loadCatalog() {
		catalogDesigns = await listPublishedDesigns({
			categoryId: selectedCategoryId || undefined,
			subcategoryId: selectedSubcategoryId || undefined,
			maxItems: 48
		});
	}

	async function loadProfile() {
		const profile = initialProfile ?? (await getManufacturerProfile(manufacturerId));
		subscribedCategoryIds = [...(profile?.subscribedCategoryIds ?? [])];
		subscribedSubcategoryIds = [...(profile?.subscribedSubcategoryIds ?? [])];
	}

	onMount(async () => {
		try {
			busy = true;
			const [categoryRows, subcategoryRows] = await Promise.all([
				listDesignCategories(),
				listDesignSubcategories()
			]);
			categories = categoryRows;
			subcategories = subcategoryRows;
			selectedCategoryId = '';
			await Promise.all([loadDecisions(), loadCatalog(), loadProfile()]);
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to load catalog.';
		} finally {
			busy = false;
		}
	});

	$: filteredSubcategories = selectedCategoryId
		? subcategories.filter((item) => item.categoryId === selectedCategoryId)
		: subcategories;

	$: categoryNameById = new Map(categories.map((item) => [item.id, item.name]));
	$: subcategoryNameById = new Map(subcategories.map((item) => [item.id, item.name]));

	async function pickCategory(id: string) {
		selectedCategoryId = id;
		if (selectedSubcategoryId && !filteredSubcategories.some((item) => item.id === selectedSubcategoryId)) {
			selectedSubcategoryId = '';
		}
		try {
			busy = true;
			notice = '';
			await loadCatalog();
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to load designs.';
		} finally {
			busy = false;
		}
	}

	async function pickSubcategory(id: string) {
		selectedSubcategoryId = id;
		try {
			busy = true;
			notice = '';
			await loadCatalog();
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to load designs.';
		} finally {
			busy = false;
		}
	}

	async function toggleCategorySubscription(categoryId: string) {
		const has = subscribedCategoryIds.includes(categoryId);
		const nextCategories = has
			? subscribedCategoryIds.filter((id) => id !== categoryId)
			: [...subscribedCategoryIds, categoryId];
		const allowedSubIds = new Set(
			subcategories.filter((item) => nextCategories.includes(item.categoryId)).map((item) => item.id)
		);
		const nextSubcategories = subscribedSubcategoryIds.filter((id) => allowedSubIds.has(id));
		try {
			busy = true;
			notice = '';
			await updateManufacturerSubscriptions(manufacturerId, {
				categoryIds: nextCategories,
				subcategoryIds: nextSubcategories
			});
			subscribedCategoryIds = nextCategories;
			subscribedSubcategoryIds = nextSubcategories;
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Could not update subscriptions.';
		} finally {
			busy = false;
		}
	}

	async function toggleSubcategorySubscription(subcategoryId: string) {
		const has = subscribedSubcategoryIds.includes(subcategoryId);
		const nextSubcategories = has
			? subscribedSubcategoryIds.filter((id) => id !== subcategoryId)
			: [...subscribedSubcategoryIds, subcategoryId];
		try {
			busy = true;
			notice = '';
			await updateManufacturerSubscriptions(manufacturerId, {
				categoryIds: subscribedCategoryIds,
				subcategoryIds: nextSubcategories
			});
			subscribedSubcategoryIds = nextSubcategories;
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Could not update subscriptions.';
		} finally {
			busy = false;
		}
	}

	async function verdict(designId: string, v: ManufacturerDesignVerdict) {
		try {
			busy = true;
			notice = '';
			await setManufacturerDesignDecision(manufacturerId, designId, v);
			decisions.set(designId, v);
			decisions = decisions;
			notice = v === 'accepted' ? 'Marked as accepted.' : 'Marked as declined.';
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="card bg-base-100 border border-base-300">
	<div class="card-body gap-4">
		<h2 class="card-title">Published concepts by category</h2>
		<p class="text-sm text-base-content/70">
			Browse published product concepts. Accept ideas you can manufacture or decline ones that are not
			a fit.
		</p>

		{#if notice}
			<div class="alert alert-info text-sm py-2">
				<span>{notice}</span>
			</div>
		{/if}

		<div role="tablist" class="tabs tabs-box tabs-sm flex-wrap gap-1">
			<button
				type="button"
				role="tab"
				class="tab"
				class:tab-active={selectedCategoryId === ''}
				onclick={() => void pickCategory('')}
				disabled={busy}
			>
				All
			</button>
			{#each categories as cat (cat.id)}
				<button
					type="button"
					role="tab"
					class="tab"
					class:tab-active={selectedCategoryId === cat.id}
					onclick={() => void pickCategory(cat.id)}
					disabled={busy}
				>
					{cat.name}
				</button>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2 items-center">
			<select
				class="select select-bordered select-sm"
				bind:value={selectedSubcategoryId}
				onchange={(event) => void pickSubcategory((event.currentTarget as HTMLSelectElement).value)}
				disabled={busy}
			>
				<option value="">All sub-categories</option>
				{#each filteredSubcategories as sub (sub.id)}
					<option value={sub.id}>{sub.name}</option>
				{/each}
			</select>
		</div>

		<div class="rounded-box border border-base-300 p-3 space-y-3">
			<h3 class="font-semibold text-sm">Subscriptions</h3>
			<div class="flex flex-wrap gap-2">
				{#each categories as cat (cat.id)}
					<button
						type="button"
						class="btn btn-xs"
						class:btn-primary={subscribedCategoryIds.includes(cat.id)}
						class:btn-outline={!subscribedCategoryIds.includes(cat.id)}
						onclick={() => void toggleCategorySubscription(cat.id)}
						disabled={busy}
					>
						{subscribedCategoryIds.includes(cat.id) ? 'Subscribed' : 'Subscribe'}: {cat.name}
					</button>
				{/each}
			</div>
			{#if selectedCategoryId}
				<div class="flex flex-wrap gap-2">
					{#each filteredSubcategories as sub (sub.id)}
						<button
							type="button"
							class="btn btn-xs"
							class:btn-secondary={subscribedSubcategoryIds.includes(sub.id)}
							class:btn-ghost={!subscribedSubcategoryIds.includes(sub.id)}
							onclick={() => void toggleSubcategorySubscription(sub.id)}
							disabled={busy || !subscribedCategoryIds.includes(sub.categoryId)}
						>
							{subscribedSubcategoryIds.includes(sub.id) ? 'Subscribed' : 'Subscribe'}: {sub.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if busy && catalogDesigns.length === 0}
			<div class="grid sm:grid-cols-2 gap-3">
				{#each [0, 1, 2, 3] as i (i)}
					<div class="card border border-base-300">
						<div class="card-body space-y-2">
							<div class="skeleton h-32 w-full"></div>
							<div class="skeleton h-4 w-2/3"></div>
							<div class="skeleton h-3 w-full"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if catalogDesigns.length === 0}
			<p class="text-sm text-base-content/70">No published concepts in this view yet.</p>
		{:else}
			<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
				{#each catalogDesigns as design (design.id)}
					<div class="card border border-base-300 bg-base-100">
						<figure class="aspect-video bg-base-200 border-b border-base-300">
							{#if designCoverImageUrl(design)}
								<img
									src={designCoverImageUrl(design) ?? ''}
									alt=""
									class="w-full h-full object-cover"
								/>
							{:else}
								<div class="w-full h-full flex items-center justify-center text-base-content/40 text-sm">
									No image
								</div>
							{/if}
						</figure>
						<div class="card-body gap-2 p-4">
							<h3 class="card-title text-base leading-tight">{design.title}</h3>
							<p class="text-sm text-base-content/70 line-clamp-2">{design.description}</p>
							<div class="flex flex-wrap gap-1">
								<span class="badge badge-outline badge-sm">{design.designType}</span>
								{#if categoryNameById.get(design.categoryId)}
									<span class="badge badge-ghost badge-sm">{categoryNameById.get(design.categoryId)}</span>
								{/if}
								{#each design.subcategoryIds ?? [] as subId (subId)}
									{#if subcategoryNameById.get(subId)}
										<span class="badge badge-ghost badge-sm">{subcategoryNameById.get(subId)}</span>
									{/if}
								{/each}
								{#if decisions.get(design.id) === 'accepted'}
									<span class="badge badge-success badge-sm">You accepted</span>
								{:else if decisions.get(design.id) === 'declined'}
									<span class="badge badge-neutral badge-sm">You declined</span>
								{/if}
							</div>
							{#if design.characteristics?.length}
								<dl class="text-xs space-y-0.5 border-t border-base-200 pt-2 mt-1">
									{#each design.characteristics.slice(0, 6) as c, ci (`${design.id}-${ci}`)}
										{#if c.key}
											<div class="flex gap-2 justify-between gap-4">
												<dt class="text-base-content/60 shrink-0">{c.key}</dt>
												<dd class="font-medium text-end truncate" title={c.value}>{c.value}</dd>
											</div>
										{/if}
									{/each}
								</dl>
							{/if}
							<div class="card-actions justify-end flex-wrap gap-2 mt-2">
								<a class="btn btn-ghost btn-sm" href={`/design/${design.id}`}>Details</a>
								<button
									type="button"
									class="btn btn-success btn-sm"
									disabled={busy}
									onclick={() => void verdict(design.id, 'accepted')}
								>
									Accept
								</button>
								<button
									type="button"
									class="btn btn-outline btn-sm"
									disabled={busy}
									onclick={() => void verdict(design.id, 'declined')}
								>
									Decline
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
