<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import ContractorCatalogSection from '$lib/components/dashboard/ContractorCatalogSection.svelte';
	import { listManufacturerOrders, updateOrderStatus } from '$lib/services/orders';
	import { authLoading, authUser } from '$lib/stores/auth';
	import type { Order, OrderStatus } from '$lib/types/domain';

	let manufacturerOrders = $state<Order[]>([]);
	let busy = $state(false);
	let notice = $state('');

	onMount(() => {
		const run = () => void loadOrders();
		run();
		const unsubs = [authLoading.subscribe(run), authUser.subscribe(run)];
		return () => unsubs.forEach((u) => u());
	});

	async function loadOrders(): Promise<void> {
		if (get(authLoading)) return;
		const user = get(authUser);
		if (!user) return;
		manufacturerOrders = await listManufacturerOrders(user.uid);
	}

	async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
		try {
			busy = true;
			notice = '';
			await updateOrderStatus(orderId, status, { status, at: new Date().toISOString() });
			await loadOrders();
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to update status.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Contractor catalog · Diseyn</title>
</svelte:head>

{#if $authLoading}
	<div class="flex justify-center py-12">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if !$authUser}
	<div class="alert alert-warning">
		<span>Sign in to browse the contractor catalog.</span>
		<a class="btn btn-sm btn-primary" href="/auth">Go to auth</a>
	</div>
{:else}
	{#if notice}
		<div class="alert alert-info text-sm py-2 mb-4">
			<span>{notice}</span>
		</div>
	{/if}

	<ContractorCatalogSection manufacturerId={$authUser.uid} />

	<div class="card bg-base-100 border border-base-300 mt-4">
		<div class="card-body">
			<h2 class="card-title">Assigned orders</h2>
			{#if manufacturerOrders.length === 0}
				<p class="text-sm text-base-content/70">No assigned orders yet.</p>
			{:else}
				<div class="overflow-x-auto rounded-box border border-base-300">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>Order</th>
								<th>Status</th>
								<th class="text-end">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each manufacturerOrders as order (order.id)}
								<tr>
									<td class="font-semibold">#{order.id}</td>
									<td><span class="badge badge-outline">{order.status}</span></td>
									<td class="text-end">
										<div class="join join-vertical sm:join-horizontal">
											<button
												type="button"
												class="btn btn-xs join-item"
												disabled={busy}
												onclick={() => void setOrderStatus(order.id, 'accepted')}
											>
												accept
											</button>
											<button
												type="button"
												class="btn btn-xs join-item"
												disabled={busy}
												onclick={() => void setOrderStatus(order.id, 'in_production')}
											>
												production
											</button>
											<button
												type="button"
												class="btn btn-xs join-item"
												disabled={busy}
												onclick={() => void setOrderStatus(order.id, 'ready')}
											>
												ready
											</button>
											<button
												type="button"
												class="btn btn-xs join-item"
												disabled={busy}
												onclick={() => void setOrderStatus(order.id, 'completed')}
											>
												complete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/if}
