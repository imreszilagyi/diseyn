<script lang="ts">
	import { onMount } from 'svelte';
	import { listDesignCategories, listPublishedDesigns } from '$lib/services/designs';
	import type { DesignCategory, DesignItem } from '$lib/types/domain';

	let categories: DesignCategory[] = [];
	let latestDesigns: DesignItem[] = [];
	let loading = true;
	let errorMessage = '';

	onMount(async () => {
		loading = true;
		errorMessage = '';
		try {
			const [categoryResult, designResult] = await Promise.all([
				listDesignCategories(),
				listPublishedDesigns()
			]);
			categories = categoryResult;
			latestDesigns = designResult.slice(0, 8);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load landing content.';
		} finally {
			loading = false;
		}
	});
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
	<h2 class="text-2xl font-semibold mb-3">Latest designs</h2>

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
					<div class="card-body">
						<h3 class="card-title text-lg">{design.title}</h3>
						<p class="text-sm text-base-content/70 line-clamp-3">{design.description}</p>
						<div class="card-actions justify-between items-center mt-2">
							<div class="badge badge-outline">{design.designType}</div>
							<span class="text-xs text-base-content/60">{new Date(design.createdAt).toLocaleDateString()}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
