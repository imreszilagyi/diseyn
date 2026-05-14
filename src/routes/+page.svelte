<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		listDesignCategories,
		listDesignSubcategories,
		listDesignerDesigns,
		listPublishedDesigns
	} from '$lib/services/designs';
	import { authUser, userProfile } from '$lib/stores/auth';
	import type { DesignCategory, DesignItem, DesignSubcategory } from '$lib/types/domain';
	import { designCoverImageUrl } from '$lib/utils/design-media';

	let categories: DesignCategory[] = [];
	let subcategories: DesignSubcategory[] = [];
	let latestDesigns: DesignItem[] = [];
	let selectedCategoryId = '';
	let selectedSubcategoryId = '';
	let loading = true;
	let errorMessage = '';

	async function loadDesigns(): Promise<void> {
		const published = await listPublishedDesigns({
			categoryId: selectedCategoryId || undefined,
			subcategoryId: selectedSubcategoryId || undefined,
			maxItems: 8
		});
		const currentUser = get(authUser);
		const profile = get(userProfile);
		const isDesigner = !!currentUser && !!profile?.roles?.includes('designer');
		if (!isDesigner || !currentUser) {
			latestDesigns = published;
			return;
		}
		const ownDesigns = await listDesignerDesigns(currentUser.uid);
		const ownDrafts = ownDesigns.filter((item) => item.status === 'draft');
		const merged = [...ownDrafts, ...published];
		const unique = new Map<string, DesignItem>();
		for (const item of merged) {
			if (!unique.has(item.id)) unique.set(item.id, item);
		}
		latestDesigns = Array.from(unique.values()).slice(0, 8);
	}

	onMount(async () => {
		loading = true;
		errorMessage = '';
		try {
			const [categoryResult, subcategoryResult] = await Promise.all([
				listDesignCategories(),
				listDesignSubcategories()
			]);
			categories = categoryResult;
			subcategories = subcategoryResult;
			await loadDesigns();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load landing content.';
		} finally {
			loading = false;
		}
	});

	$: filteredSubcategories = selectedCategoryId
		? subcategories.filter((item) => item.categoryId === selectedCategoryId)
		: subcategories;

	$: categoryNameById = new Map(categories.map((item) => [item.id, item.name]));
	$: subcategoryPathById = (() => {
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
			const parentPath =
				parentId && byId.has(parentId) ? `${buildPath(parentId)} / ` : '';
			const label = `${parentPath}${node.name}`;
			visiting.delete(id);
			pathById.set(id, label);
			return label;
		};

		for (const subcategory of subcategories) {
			buildPath(subcategory.id);
		}

		return pathById;
	})();

	async function applyFilters(): Promise<void> {
		loading = true;
		errorMessage = '';
		try {
			await loadDesigns();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to filter designs.';
		} finally {
			loading = false;
		}
	}
</script>

<section class="hero bg-base-100 rounded-box border border-base-300 mb-6">
	<div class="hero-content text-center py-16">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-bold">Bring your ideas to life</h1>
			<p class="py-4 text-base-content/80">
				Discover ready-to-build designs from creators and connect with manufacturers in one place.
			</p>
			<div class="flex justify-center gap-2">
				<a class="btn btn-primary" href="/auth">Get started</a>
				<a class="btn btn-ghost" href="/dashboard">Open dashboard</a>
			</div>
		</div>
	</div>
</section>

<section class="mb-8">
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-2xl font-semibold">Categories</h2>
		<span class="text-sm text-base-content/70">placeholder cards</span>
	</div>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
		{#if categories.length > 0}
			{#each categories as category (category.id)}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body p-4">
						<h3 class="card-title text-base">{category.name}</h3>
						<p class="text-sm text-base-content/70">{category.description || 'No description yet.'}</p>
					</div>
				</div>
			{/each}
		{:else}
			{#each Array(4) as _, i (i)}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body p-4">
						<div class="skeleton h-4 w-2/3 mb-2"></div>
						<div class="skeleton h-3 w-full"></div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>

<section>
	<div class="flex flex-wrap items-end gap-2 justify-between mb-3">
		<h2 class="text-2xl font-semibold">Latest designs</h2>
		<div class="flex flex-wrap gap-2">
			<select
				class="select select-bordered select-sm"
				bind:value={selectedCategoryId}
				onchange={() => {
					if (
						selectedSubcategoryId &&
						!filteredSubcategories.some((item) => item.id === selectedSubcategoryId)
					) {
						selectedSubcategoryId = '';
					}
					void applyFilters();
				}}
			>
				<option value="">All categories</option>
				{#each categories as category (category.id)}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>
			<select
				class="select select-bordered select-sm"
				bind:value={selectedSubcategoryId}
				onchange={() => void applyFilters()}
			>
				<option value="">All sub-categories</option>
				{#each filteredSubcategories as subcategory (subcategory.id)}
					<option value={subcategory.id}>
						{subcategoryPathById.get(subcategory.id) ?? subcategory.name}
					</option>
				{/each}
			</select>
		</div>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each Array(6) as _, i (i)}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<div class="skeleton h-5 w-2/3 mb-2"></div>
						<div class="skeleton h-4 w-full"></div>
						<div class="skeleton h-4 w-1/2"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if errorMessage}
		<div class="alert alert-error">
			<span>{errorMessage}</span>
		</div>
	{:else if latestDesigns.length === 0}
		<div class="alert">
			<span>No published designs yet. Check back soon.</span>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each latestDesigns as design (design.id)}
				<a href={`/design/${design.id}`} class="card bg-base-100 border border-base-300 hover:border-primary">
					{#if designCoverImageUrl(design)}
						<figure class="aspect-video border-b border-base-300 bg-base-200">
							<img
								src={designCoverImageUrl(design) ?? ''}
								alt=""
								class="w-full h-full object-cover"
							/>
						</figure>
					{/if}
					<div class="card-body">
						<h3 class="card-title text-lg">{design.title}</h3>
						<p class="text-sm text-base-content/70 line-clamp-3">{design.description}</p>
						<div class="card-actions justify-between items-center mt-2">
							<div class="flex flex-wrap gap-1">
								<div class="badge badge-outline">{design.designType}</div>
								{#if categoryNameById.get(design.categoryId)}
									<div class="badge badge-ghost">{categoryNameById.get(design.categoryId)}</div>
								{/if}
								{#each design.subcategoryIds ?? [] as subcategoryId (subcategoryId)}
									{#if subcategoryPathById.get(subcategoryId)}
										<div class="badge badge-ghost">{subcategoryPathById.get(subcategoryId)}</div>
									{/if}
								{/each}
							</div>
							<span class="text-xs text-base-content/60">{new Date(design.createdAt).toLocaleDateString()}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
