<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import {
		getDesignById,
		listDesignCategories,
		listDesignSubcategories,
		updateDesignItem
	} from '$lib/services/designs';
	import { authUser, userProfile } from '$lib/stores/auth';
	import {
		listDecisionsForManufacturer,
		setManufacturerDesignDecision
	} from '$lib/services/manufacturer-design-decisions';
	import type {
		DesignCategory,
		DesignItem,
		DesignSubcategory,
		ManufacturerDesignVerdict
	} from '$lib/types/domain';
	import { designCoverImageUrl } from '$lib/utils/design-media';

	let loading = true;
	let design: DesignItem | null = null;
	let errorMessage = '';
	let categories: DesignCategory[] = [];
	let subcategories: DesignSubcategory[] = [];

	let statusEdit: DesignItem['status'] = 'draft';
	let statusBusy = false;
	let statusNotice = '';
	let manufacturerVerdict: ManufacturerDesignVerdict | undefined;
	let verdictBusy = false;
	let verdictNotice = '';
	let loadedVerdictKey = '';

	onMount(async () => {
		loading = true;
		errorMessage = '';
		try {
			const id = $page.params.id;
			if (!id) {
				errorMessage = 'Design not found.';
				return;
			}
			const [designResult, categoryRows, subcategoryRows] = await Promise.all([
				getDesignById(id),
				listDesignCategories(),
				listDesignSubcategories()
			]);
			design = designResult;
			categories = categoryRows;
			subcategories = subcategoryRows;
			if (!design) {
				errorMessage = 'Design not found.';
			} else {
				statusEdit = design.status ?? 'draft';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load design.';
		} finally {
			loading = false;
		}
	});

	async function saveDesignStatus(): Promise<void> {
		if (!design) return;
		const user = get(authUser);
		if (!user || design.designerId !== user.uid) return;
		try {
			statusBusy = true;
			statusNotice = '';
			await updateDesignItem(design.id, { status: statusEdit });
			const next = await getDesignById(design.id);
			design = next;
			if (design) statusEdit = design.status ?? 'draft';
			statusNotice = 'Status saved.';
		} catch (error) {
			statusNotice = error instanceof Error ? error.message : 'Could not save status.';
		} finally {
			statusBusy = false;
		}
	}

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
	$: isSignedIn = !!$authUser;
	$: activeRole = $userProfile?.activeRole;
	$: isDesignerOwner =
		!!design &&
		isSignedIn &&
		!!$userProfile?.roles?.includes('designer') &&
		design.designerId === $authUser?.uid;

	$: if (isSignedIn && design && activeRole === 'manufacturer' && $authUser) {
		const key = `${$authUser.uid}:${design.id}`;
		if (key !== loadedVerdictKey) {
			loadedVerdictKey = key;
			void loadManufacturerVerdict($authUser.uid, design.id);
		}
	}

	async function loadManufacturerVerdict(manufacturerId: string, designId: string): Promise<void> {
		try {
			const decisions = await listDecisionsForManufacturer(manufacturerId);
			manufacturerVerdict = decisions.get(designId);
		} catch {
			manufacturerVerdict = undefined;
		}
	}

	async function saveManufacturerVerdict(verdict: ManufacturerDesignVerdict): Promise<void> {
		const user = get(authUser);
		if (!user || !design) return;
		try {
			verdictBusy = true;
			verdictNotice = '';
			await setManufacturerDesignDecision(user.uid, design.id, verdict);
			manufacturerVerdict = verdict;
			verdictNotice = verdict === 'accepted' ? 'Marked as accepted.' : 'Marked as declined.';
		} catch (error) {
			verdictNotice = error instanceof Error ? error.message : 'Could not save decision.';
		} finally {
			verdictBusy = false;
		}
	}
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
		<div class="card-body gap-4">
			<h1 class="card-title text-3xl">{design.title}</h1>
			<p class="text-base-content/80">{design.description}</p>
			<div class="flex gap-2 flex-wrap">
				<div class="badge badge-outline">{design.designType}</div>
				{#if isDesignerOwner}
					<div class="badge badge-secondary">{design.status}</div>
				{/if}
				{#if categoryNameById.get(design.categoryId)}
					<div class="badge badge-ghost">{categoryNameById.get(design.categoryId)}</div>
				{/if}
				{#each design.subcategoryIds ?? [] as subcategoryId (subcategoryId)}
					{#if subcategoryPathById.get(subcategoryId)}
						<div class="badge badge-ghost">{subcategoryPathById.get(subcategoryId)}</div>
					{/if}
				{/each}
			</div>
			{#if isDesignerOwner}
				<p class="text-sm text-base-content/70">
					{design.status === 'published' ? 'Published' : 'Created'} on
					{new Date(design.createdAt).toLocaleString()}
				</p>
			{:else if design.createdAt}
				<p class="text-sm text-base-content/70">
					Added on {new Date(design.createdAt).toLocaleString()}
				</p>
			{/if}

			{#if design.imageUrls?.filter(Boolean).length}
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{#each design.imageUrls.filter(Boolean) as src (src)}
						<img
							src={src}
							alt=""
							class="rounded-box border border-base-300 w-full aspect-square object-cover"
						/>
					{/each}
				</div>
			{:else if designCoverImageUrl(design)}
				<img
					src={designCoverImageUrl(design) ?? ''}
					alt=""
					class="rounded-box border border-base-300 w-full max-h-80 object-cover"
				/>
			{/if}

			{#if design.characteristics?.length}
				<div class="rounded-box border border-base-300 overflow-hidden">
					<table class="table table-sm">
						<tbody>
							{#each design.characteristics as row, ri (`r-${ri}`)}
								{#if row.key}
									<tr>
										<th class="w-1/3 text-base-content/70">{row.key}</th>
										<td>{row.value}</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if isDesignerOwner}
				<div class="rounded-box border border-primary/30 bg-base-200/40 p-4 space-y-3">
					<h2 class="font-semibold text-sm">Your design — catalog visibility</h2>
					<p class="text-xs text-base-content/70">
						Only <span class="font-medium">Published</span> designs appear in the public catalog and customer
						pickers. Drafts are visible to you when signed in.
					</p>
					<label class="form-control w-full max-w-xs">
						<span class="label-text text-sm">Status</span>
						<select class="select select-bordered select-sm w-full" bind:value={statusEdit}>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
							<option value="archived">Archived</option>
						</select>
					</label>
					<div class="flex flex-wrap gap-2 items-center">
						<button
							type="button"
							class="btn btn-primary btn-sm"
							disabled={statusBusy || statusEdit === design.status}
							onclick={() => void saveDesignStatus()}
						>
							{statusBusy ? 'Saving…' : 'Save status'}
						</button>
						<a class="btn btn-ghost btn-sm" href="/dashboard/designer">Open designer dashboard</a>
					</div>
					{#if statusNotice}
						<p class="text-sm text-base-content/80">{statusNotice}</p>
					{/if}
				</div>
			{/if}

			<div class="card-actions mt-2 flex-wrap gap-2">
				{#if !isSignedIn}
					<a href="/auth" class="btn btn-primary">Login to continue</a>
					<a href="/dashboard/customer" class="btn btn-outline">Order this design</a>
				{:else if activeRole === 'manufacturer'}
					<a class="btn btn-ghost" href="/dashboard/manufacturer">Back to catalog</a>
					{#if manufacturerVerdict === 'accepted'}
						<span class="badge badge-success self-center">You accepted</span>
					{:else if manufacturerVerdict === 'declined'}
						<span class="badge badge-neutral self-center">You declined</span>
					{/if}
					<button
						type="button"
						class="btn btn-success btn-sm"
						disabled={verdictBusy}
						onclick={() => void saveManufacturerVerdict('accepted')}
					>
						Accept
					</button>
					<button
						type="button"
						class="btn btn-outline btn-sm"
						disabled={verdictBusy}
						onclick={() => void saveManufacturerVerdict('declined')}
					>
						Decline
					</button>
					{#if verdictNotice}
						<span class="text-sm text-base-content/70 w-full">{verdictNotice}</span>
					{/if}
				{:else if activeRole === 'customer'}
					<a href="/dashboard/customer" class="btn btn-primary">Order this design</a>
					<a href="/dashboard" class="btn btn-ghost">Dashboard</a>
				{:else if activeRole === 'designer'}
					<a href="/dashboard/designer" class="btn btn-primary">Designer dashboard</a>
				{:else}
					<a href="/dashboard" class="btn btn-primary">Open dashboard</a>
				{/if}
			</div>
		</div>
	</div>
{/if}
