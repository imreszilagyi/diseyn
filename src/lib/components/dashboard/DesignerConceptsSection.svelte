<script lang="ts">
	import { onMount } from 'svelte';
	import { createDesignItem, listDesignCategories, updateDesignItem } from '$lib/services/designs';
	import { uploadDesignConceptImage } from '$lib/services/design-storage';
	import type { DesignCategory, DesignCharacteristic, DesignItem } from '$lib/types/domain';
	import { designCoverImageUrl } from '$lib/utils/design-media';

	export let designerId: string;
	export let items: DesignItem[];
	export let onRefresh: () => Promise<void> = async () => {};

	let categories: DesignCategory[] = [];
	let busy = false;
	let notice = '';

	let newFiles: FileList | null = null;
	let cTitle = '';
	let cDescription = '';
	let cCategoryId = '';
	let cDesignType = '';
	let cCharacteristics: DesignCharacteristic[] = [{ key: '', value: '' }];

	let editingSelection = '';
	let eTitle = '';
	let eDescription = '';
	let eCategoryId = '';
	let eDesignType = '';
	let eStatus: DesignItem['status'] = 'draft';
	let eCharacteristics: DesignCharacteristic[] = [{ key: '', value: '' }];
	let eImageUrls: string[] = [];
	let eNewFiles: FileList | null = null;

	function normalizeCharacteristics(rows: DesignCharacteristic[]): DesignCharacteristic[] {
		return rows
			.map((r) => ({ key: r.key.trim(), value: r.value.trim() }))
			.filter((r) => r.key.length > 0 || r.value.length > 0);
	}

	onMount(async () => {
		try {
			categories = await listDesignCategories();
		} catch {
			categories = [];
		}
	});

	function startEdit(item: DesignItem) {
		editingSelection = item.id;
		eTitle = item.title;
		eDescription = item.description;
		eCategoryId = item.categoryId;
		eDesignType = item.designType;
		eStatus = item.status;
		eCharacteristics =
			item.characteristics?.length && item.characteristics.some((c) => c.key || c.value)
				? item.characteristics.map((c) => ({ ...c }))
				: [{ key: '', value: '' }];
		eImageUrls = [
			...(item.imageUrls?.filter(Boolean) ?? (item.imageUrl ? [item.imageUrl] : []))
		];
		eNewFiles = null;
	}

	function cancelEdit() {
		editingSelection = '';
	}

	async function saveEdit() {
		if (!editingSelection) return;
		try {
			busy = true;
			notice = '';
			const ch = normalizeCharacteristics(eCharacteristics);
			await updateDesignItem(editingSelection, {
				title: eTitle.trim(),
				description: eDescription.trim(),
				categoryId: eCategoryId.trim(),
				designType: eDesignType.trim(),
				status: eStatus,
				characteristics: ch.length ? ch : [],
				imageUrls: eImageUrls,
				imageUrl: eImageUrls[0] ?? ''
			});
			const files = eNewFiles;
			if (files?.length) {
				const next = [...eImageUrls];
				for (const f of Array.from(files)) {
					next.push(await uploadDesignConceptImage(designerId, editingSelection, f));
				}
				eImageUrls = next;
				await updateDesignItem(editingSelection, {
					imageUrls: eImageUrls,
					imageUrl: eImageUrls[0] ?? ''
				});
			}
			eNewFiles = null;
			await onRefresh();
			notice = 'Concept updated.';
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to update.';
		} finally {
			busy = false;
		}
	}

	async function createConcept() {
		try {
			busy = true;
			notice = '';
			const ch = normalizeCharacteristics(cCharacteristics);
			const id = await createDesignItem({
				title: cTitle.trim(),
				description: cDescription.trim(),
				categoryId: cCategoryId.trim(),
				designerId,
				imageUrls: [],
				imageUrl: '',
				characteristics: ch.length ? ch : [],
				designType: cDesignType.trim(),
				status: 'draft',
				createdAt: new Date().toISOString()
			});
			const files = newFiles;
			const urls: string[] = [];
			if (files?.length) {
				for (const f of Array.from(files)) {
					urls.push(await uploadDesignConceptImage(designerId, id, f));
				}
				await updateDesignItem(id, {
					imageUrls: urls,
					imageUrl: urls[0] ?? ''
				});
			}
			cTitle = '';
			cDescription = '';
			cCategoryId = '';
			cDesignType = '';
			cCharacteristics = [{ key: '', value: '' }];
			newFiles = null;
			await onRefresh();
			notice = 'Concept created.';
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to create.';
		} finally {
			busy = false;
		}
	}

	function addCharRow(which: 'new' | 'edit') {
		if (which === 'new') cCharacteristics = [...cCharacteristics, { key: '', value: '' }];
		else eCharacteristics = [...eCharacteristics, { key: '', value: '' }];
	}

	function removeCharRow(index: number, which: 'new' | 'edit') {
		if (which === 'new') cCharacteristics = cCharacteristics.filter((_, i) => i !== index);
		else eCharacteristics = eCharacteristics.filter((_, i) => i !== index);
	}

	async function removeImageAt(index: number) {
		if (!editingSelection) return;
		eImageUrls = eImageUrls.filter((_, i) => i !== index);
		try {
			busy = true;
			await updateDesignItem(editingSelection, {
				imageUrls: eImageUrls,
				imageUrl: eImageUrls[0] ?? ''
			});
			await onRefresh();
		} catch (e) {
			notice = e instanceof Error ? e.message : 'Failed to remove image.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="card bg-base-100 border border-base-300">
	<div class="card-body gap-4">
		<h2 class="card-title">Product concepts</h2>
		<p class="text-sm text-base-content/70">
			Create drafts, upload reference images, and define characteristics. Publish when ready for the
			catalog.
		</p>

		{#if notice}
			<div class="alert alert-info text-sm py-2">
				<span>{notice}</span>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-box border border-base-300 p-4 space-y-3">
				<h3 class="font-semibold">New concept</h3>
				<form
					class="space-y-3"
					onsubmit={(e) => {
						e.preventDefault();
						void createConcept();
					}}
				>
					<input class="input input-bordered w-full" placeholder="Title" bind:value={cTitle} required />
					<textarea
						class="textarea textarea-bordered w-full"
						placeholder="Description"
						bind:value={cDescription}
						required
					></textarea>
					{#if categories.length}
						<select class="select select-bordered w-full" bind:value={cCategoryId} required>
							<option value="">Category…</option>
							{#each categories as cat (cat.id)}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					{:else}
						<input
							class="input input-bordered w-full"
							placeholder="Category ID"
							bind:value={cCategoryId}
							required
						/>
					{/if}
					<input class="input input-bordered w-full" placeholder="Design type" bind:value={cDesignType} required />

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">Characteristics</span>
							<button type="button" class="btn btn-ghost btn-xs" onclick={() => addCharRow('new')}>Add row</button>
						</div>
						{#each cCharacteristics as row, i (i)}
							<div class="flex gap-2 items-center">
								<input class="input input-bordered input-sm flex-1" placeholder="Name" bind:value={row.key} />
								<input class="input input-bordered input-sm flex-1" placeholder="Value" bind:value={row.value} />
								<button
									type="button"
									class="btn btn-ghost btn-sm btn-square"
									aria-label="Remove row"
									onclick={() => removeCharRow(i, 'new')}
									disabled={cCharacteristics.length <= 1}
								>
									×
								</button>
							</div>
						{/each}
					</div>

					<label class="form-control w-full">
						<span class="label-text text-sm">Images (optional)</span>
						<input class="file-input file-input-bordered file-input-sm w-full" type="file" accept="image/*" multiple bind:files={newFiles} />
					</label>

					<button type="submit" class="btn btn-primary w-full" disabled={busy} class:loading={busy}>Save concept</button>
				</form>
			</div>

			<div class="rounded-box border border-base-300 p-4 space-y-3 min-h-[12rem]">
				<h3 class="font-semibold">Edit concept</h3>
				{#if items.length === 0}
					<p class="text-sm text-base-content/70">Save a concept first, then select it here.</p>
				{:else}
					<select
						class="select select-bordered w-full"
						value={editingSelection}
						onchange={(e) => {
							const v = (e.currentTarget as HTMLSelectElement).value;
							if (!v) {
								editingSelection = '';
								cancelEdit();
								return;
							}
							const picked = items.find((x) => x.id === v);
							if (picked) startEdit(picked);
						}}
					>
						<option value="">Choose…</option>
						{#each items as item (item.id)}
							<option value={item.id}>{item.title} — {item.status}</option>
						{/each}
					</select>
				{/if}

				{#if editingSelection}
					{@const active = items.find((x) => x.id === editingSelection)}
					{#if active}
						<form
							class="space-y-3"
							onsubmit={(e) => {
								e.preventDefault();
								void saveEdit();
							}}
						>
							<input class="input input-bordered w-full" placeholder="Title" bind:value={eTitle} required />
							<textarea
								class="textarea textarea-bordered w-full"
								placeholder="Description"
								bind:value={eDescription}
								required
							></textarea>
							{#if categories.length}
								<select class="select select-bordered w-full" bind:value={eCategoryId} required>
									{#each categories as cat (cat.id)}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</select>
							{:else}
								<input class="input input-bordered w-full" placeholder="Category ID" bind:value={eCategoryId} required />
							{/if}
							<input class="input input-bordered w-full" placeholder="Design type" bind:value={eDesignType} required />
							<select class="select select-bordered w-full" bind:value={eStatus}>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
								<option value="archived">Archived</option>
							</select>

							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">Characteristics</span>
									<button type="button" class="btn btn-ghost btn-xs" onclick={() => addCharRow('edit')}>Add row</button>
								</div>
								{#each eCharacteristics as row, i (i)}
									<div class="flex gap-2 items-center">
										<input class="input input-bordered input-sm flex-1" placeholder="Name" bind:value={row.key} />
										<input class="input input-bordered input-sm flex-1" placeholder="Value" bind:value={row.value} />
										<button
											type="button"
											class="btn btn-ghost btn-sm btn-square"
											aria-label="Remove row"
											onclick={() => removeCharRow(i, 'edit')}
											disabled={eCharacteristics.length <= 1}
										>
											×
										</button>
									</div>
								{/each}
							</div>

							<div class="space-y-2">
								<span class="text-sm font-medium">Images</span>
								<div class="flex flex-wrap gap-2">
									{#each eImageUrls as url, i (url)}
										<div class="relative w-20 h-20 rounded-box border border-base-300 overflow-hidden group">
											<img src={url} alt="" class="w-full h-full object-cover" />
											<button
												type="button"
												class="btn btn-error btn-xs absolute bottom-1 right-1 opacity-90"
												onclick={() => void removeImageAt(i)}
												disabled={busy}
											>
												Remove
											</button>
										</div>
									{/each}
								</div>
								<label class="form-control w-full">
									<span class="label-text text-sm">Add images</span>
									<input
										class="file-input file-input-bordered file-input-sm w-full"
										type="file"
										accept="image/*"
										multiple
										bind:files={eNewFiles}
									/>
								</label>
							</div>

							<div class="flex flex-wrap gap-2">
								<button type="submit" class="btn btn-primary" disabled={busy} class:loading={busy}>Save changes</button>
								<button type="button" class="btn btn-ghost" onclick={cancelEdit} disabled={busy}>Close</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>
		</div>

		<div class="divider my-0"></div>
		<h3 class="font-semibold">Your concepts</h3>
		{#if items.length === 0}
			<p class="text-sm text-base-content/70">None yet.</p>
		{:else}
			<ul class="list rounded-box border border-base-300 bg-base-100">
				{#each items as item (item.id)}
					<li class="list-row items-start gap-3 py-3">
						{#if designCoverImageUrl(item)}
							<img
								src={designCoverImageUrl(item) ?? ''}
								alt=""
								class="size-16 rounded-box object-cover border border-base-300 shrink-0"
							/>
						{:else}
							<div class="size-16 rounded-box bg-base-200 border border-base-300 shrink-0"></div>
						{/if}
						<div class="list-col-grow min-w-0">
							<div class="font-semibold">{item.title}</div>
							<div class="text-sm text-base-content/70">{item.status} — {item.designType}</div>
							{#if item.characteristics?.length}
								<div class="flex flex-wrap gap-1 mt-1">
									{#each item.characteristics.slice(0, 4) as c (c.key + c.value)}
										{#if c.key}
											<span class="badge badge-ghost badge-sm">{c.key}: {c.value}</span>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
						<button type="button" class="btn btn-sm btn-outline shrink-0" onclick={() => startEdit(item)}>Edit</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
