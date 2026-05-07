<script lang="ts">
	import { onMount } from 'svelte';
	import { listDesignCategories, listPublishedDesigns } from '$lib/services/designs';
	import {
		listDecisionsForManufacturer,
		setManufacturerDesignDecision
	} from '$lib/services/manufacturer-design-decisions';
	import type { DesignCategory, DesignItem, ManufacturerDesignVerdict } from '$lib/types/domain';
	import { designCoverImageUrl } from '$lib/utils/design-media';

	export let manufacturerId: string;

	let categories: DesignCategory[] = [];
	let selectedCategoryId = '';
	let catalogDesigns: DesignItem[] = [];
	let decisions = new Map<string, ManufacturerDesignVerdict>();
	let busy = false;
	let notice = '';

	async function loadDecisions() {
		decisions = await listDecisionsForManufacturer(manufacturerId);
	}

	async function loadCatalog() {
		const filterId = selectedCategoryId || undefined;
		catalogDesigns = await listPublishedDesigns(filterId);
	}

	onMount(async () => {
		try {
			busy = true;
			categories = await listDesignCategories();
			selectedCategoryId = '';
			await Promise.all([loadDecisions(), loadCatalog()]);
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to load catalog.';
		} finally {
			busy = false;
		}
	});

	async function pickCategory(id: string) {
		selectedCategoryId = id;
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
