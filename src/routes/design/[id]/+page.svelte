<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getDesignById } from '$lib/services/designs';
	import type { DesignItem } from '$lib/types/domain';

	let loading = true;
	let design: DesignItem | null = null;
	let errorMessage = '';

	onMount(async () => {
		loading = true;
		errorMessage = '';
		try {
			const id = $page.params.id;
			if (!id) {
				errorMessage = 'Design not found.';
				return;
			}
			design = await getDesignById(id);
			if (!design) {
				errorMessage = 'Design not found.';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load design.';
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="card bg-base-100 border border-base-300">
		<div class="card-body">
			<div class="skeleton h-6 w-1/2 mb-2"></div>
			<div class="skeleton h-4 w-full"></div>
			<div class="skeleton h-4 w-2/3"></div>
		</div>
	</div>
{:else if errorMessage}
	<div class="alert alert-warning">
		<span>{errorMessage}</span>
	</div>
{:else if design}
	<div class="card bg-base-100 border border-base-300 max-w-3xl mx-auto">
		<div class="card-body">
			<h1 class="card-title text-3xl">{design.title}</h1>
			<p class="text-base-content/80">{design.description}</p>
			<div class="flex gap-2 mt-2">
				<div class="badge badge-outline">{design.designType}</div>
				<div class="badge badge-secondary">{design.status}</div>
			</div>
			<p class="text-sm text-base-content/70 mt-2">Published on {new Date(design.createdAt).toLocaleString()}</p>

			<div class="card-actions mt-4">
				<a href="/auth" class="btn btn-primary">Login to continue</a>
				<a href="/dashboard/customer" class="btn btn-outline">Order this design</a>
			</div>
		</div>
	</div>
{/if}
