<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createDesignItem, listDesignerDesigns } from '$lib/services/designs';
	import { upsertManufacturerProfile } from '$lib/services/manufacturers';
	import {
		createOrder,
		listCustomerOrders,
		listManufacturerOrders,
		updateOrderStatus
	} from '$lib/services/orders';
	import { assignRoles } from '$lib/services/users';
	import { authUser, switchActiveRole, userProfile } from '$lib/stores/auth';
	import type { DesignItem, Order, OrderStatus, UserRole } from '$lib/types/domain';

	const allRoles: UserRole[] = ['customer', 'manufacturer', 'designer', 'admin'];

	let activeRouteRole = '' as UserRole | '';
	let customerOrders: Order[] = [];
	let manufacturerOrders: Order[] = [];
	let designerItems: DesignItem[] = [];
	let busy = false;
	let notice = '';

	let orderDesignId = '';
	let orderManufacturerId = '';

	let supportedDesignTypes = '';
	let businessName = '';
	let city = '';
	let isAvailable = true;

	let designTitle = '';
	let designDescription = '';
	let designCategoryId = '';
	let designType = '';

	let adminTargetUid = '';
	let adminRoles = '';

	$: activeRouteRole = ($page.params.role as UserRole) || '';
	$: allowedRoles = $userProfile?.roles || [];
	$: isAuthorized = allowedRoles.includes(activeRouteRole as UserRole);
	$: currentRole = activeRouteRole as UserRole;

	onMount(() => {
		void initialize();
	});

	async function initialize(): Promise<void> {
		if (!$authUser || !$userProfile || !isAuthorized) return;
		await loadRoleData();
	}

	async function loadRoleData(): Promise<void> {
		if (!$authUser) return;
		if (currentRole === 'customer') {
			customerOrders = await listCustomerOrders($authUser.uid);
		}
		if (currentRole === 'manufacturer') {
			manufacturerOrders = await listManufacturerOrders($authUser.uid);
		}
		if (currentRole === 'designer') {
			designerItems = await listDesignerDesigns($authUser.uid);
		}
	}

	async function handleRoleSwitch(role: UserRole): Promise<void> {
		try {
			busy = true;
			notice = '';
			await switchActiveRole(role);
			await goto(`/dashboard/${role}`);
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to switch role.';
		} finally {
			busy = false;
		}
	}

	async function submitOrder(): Promise<void> {
		if (!$authUser) return;
		try {
			busy = true;
			notice = '';
			await createOrder({
				customerId: $authUser.uid,
				designId: orderDesignId,
				selectedManufacturerId: orderManufacturerId,
				status: 'placed',
				timeline: [{ status: 'placed', at: new Date().toISOString() }],
				createdAt: new Date().toISOString()
			});
			orderDesignId = '';
			orderManufacturerId = '';
			await loadRoleData();
			notice = 'Order created.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to create order.';
		} finally {
			busy = false;
		}
	}

	async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
		try {
			busy = true;
			notice = '';
			await updateOrderStatus(orderId, status, { status, at: new Date().toISOString() });
			await loadRoleData();
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to update status.';
		} finally {
			busy = false;
		}
	}

	async function saveManufacturerProfile(): Promise<void> {
		if (!$authUser) return;
		try {
			busy = true;
			notice = '';
			await upsertManufacturerProfile({
				id: $authUser.uid,
				businessName,
				city,
				supportedDesignTypes: supportedDesignTypes
					.split(',')
					.map((item) => item.trim())
					.filter(Boolean),
				isAvailable
			});
			notice = 'Manufacturer profile saved.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to save profile.';
		} finally {
			busy = false;
		}
	}

	async function submitDesign(): Promise<void> {
		if (!$authUser) return;
		try {
			busy = true;
			notice = '';
			await createDesignItem({
				title: designTitle,
				description: designDescription,
				categoryId: designCategoryId,
				designerId: $authUser.uid,
				imageUrl: '',
				designType,
				status: 'draft',
				createdAt: new Date().toISOString()
			});
			designTitle = '';
			designDescription = '';
			designCategoryId = '';
			designType = '';
			await loadRoleData();
			notice = 'Design item created.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to create design item.';
		} finally {
			busy = false;
		}
	}

	async function submitRoleAssignment(): Promise<void> {
		try {
			busy = true;
			notice = '';
			const roles = adminRoles
				.split(',')
				.map((item) => item.trim())
				.filter((item): item is UserRole => allRoles.includes(item as UserRole));
			await assignRoles(adminTargetUid, roles);
			notice = 'Roles updated.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to assign roles.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
	<h1 class="text-3xl font-bold capitalize">{$page.params.role} dashboard</h1>

	{#if !$authUser}
		<div class="alert alert-warning">
			<span>You must sign in first.</span>
			<a class="btn btn-sm btn-primary" href="/auth">Go to auth</a>
		</div>
	{:else}
		<div class="card bg-base-100 border border-base-300">
			<div class="card-body">
				<h2 class="card-title text-lg">Switch role</h2>
				<div class="flex flex-wrap gap-2">
					{#each allowedRoles as role (role)}
						<button
							type="button"
							class="btn btn-sm"
							class:btn-primary={role === currentRole}
							on:click={() => handleRoleSwitch(role)}
							disabled={busy}>
							{role}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if !isAuthorized}
			<div class="card bg-base-100 border border-error">
				<div class="card-body">
					<h2 class="card-title text-error">Unauthorized role</h2>
					<p>You do not have access to <strong>{activeRouteRole}</strong>.</p>
					<div class="card-actions">
						{#each allowedRoles as role (role)}
							<a class="btn btn-outline btn-sm" href={`/dashboard/${role}`}>Go to {role}</a>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			{#if currentRole === 'customer'}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<h2 class="card-title">Place order</h2>
						<form class="grid md:grid-cols-3 gap-2" on:submit|preventDefault={submitOrder}>
							<input class="input input-bordered" placeholder="Design ID" bind:value={orderDesignId} required />
							<input
								class="input input-bordered"
								placeholder="Manufacturer ID"
								bind:value={orderManufacturerId}
								required />
							<button class="btn btn-primary" type="submit" disabled={busy}>Create order</button>
						</form>
						<div class="divider my-2"></div>
						<h3 class="font-semibold">My orders</h3>
						{#if customerOrders.length === 0}
							<p class="text-sm text-base-content/70">No orders yet.</p>
						{:else}
							<div class="space-y-2">
								{#each customerOrders as order (order.id)}
									<div class="p-3 rounded-box border border-base-300 text-sm">
										<div><strong>#{order.id}</strong></div>
										<div>Design: {order.designId}</div>
										<div>Manufacturer: {order.selectedManufacturerId}</div>
										<div>Status: {order.status}</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if currentRole === 'manufacturer'}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<h2 class="card-title">Assigned orders</h2>
						{#if manufacturerOrders.length === 0}
							<p class="text-sm text-base-content/70">No assigned orders yet.</p>
						{:else}
							<div class="space-y-2">
								{#each manufacturerOrders as order (order.id)}
									<div class="p-3 rounded-box border border-base-300">
										<div class="font-semibold">#{order.id}</div>
										<div class="text-sm mb-2">Current status: {order.status}</div>
										<div class="join">
											<button class="btn btn-xs join-item" on:click={() => setOrderStatus(order.id, 'accepted')}>
												accept
											</button>
											<button class="btn btn-xs join-item" on:click={() => setOrderStatus(order.id, 'in_production')}>
												production
											</button>
											<button class="btn btn-xs join-item" on:click={() => setOrderStatus(order.id, 'ready')}>
												ready
											</button>
											<button class="btn btn-xs join-item" on:click={() => setOrderStatus(order.id, 'completed')}>
												complete
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<div class="divider"></div>
						<h3 class="font-semibold">Supported design types</h3>
						<form class="grid md:grid-cols-2 gap-2" on:submit|preventDefault={saveManufacturerProfile}>
							<input class="input input-bordered" placeholder="Business name" bind:value={businessName} required />
							<input class="input input-bordered" placeholder="City" bind:value={city} required />
							<input
								class="input input-bordered md:col-span-2"
								placeholder="Supported types (comma separated)"
								bind:value={supportedDesignTypes}
								required />
							<label class="label cursor-pointer md:col-span-2 justify-start gap-2">
								<input class="toggle toggle-primary" type="checkbox" bind:checked={isAvailable} />
								<span class="label-text">Available for new work</span>
							</label>
							<button class="btn btn-primary md:col-span-2" type="submit" disabled={busy}>
								Save profile
							</button>
						</form>
					</div>
				</div>
			{/if}

			{#if currentRole === 'designer'}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<h2 class="card-title">Create design item</h2>
						<form class="grid md:grid-cols-2 gap-2" on:submit|preventDefault={submitDesign}>
							<input class="input input-bordered md:col-span-2" placeholder="Title" bind:value={designTitle} required />
							<textarea
								class="textarea textarea-bordered md:col-span-2"
								placeholder="Description"
								bind:value={designDescription}
								required></textarea>
							<input class="input input-bordered" placeholder="Category ID" bind:value={designCategoryId} required />
							<input class="input input-bordered" placeholder="Design type" bind:value={designType} required />
							<button class="btn btn-primary md:col-span-2" type="submit" disabled={busy}>Add design</button>
						</form>

						<div class="divider"></div>
						<h3 class="font-semibold">My design items</h3>
						{#if designerItems.length === 0}
							<p class="text-sm text-base-content/70">No design items yet.</p>
						{:else}
							<div class="space-y-2">
								{#each designerItems as item (item.id)}
									<div class="p-3 rounded-box border border-base-300">
										<div class="font-semibold">{item.title}</div>
										<div class="text-sm text-base-content/70">{item.status} - {item.designType}</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if currentRole === 'admin'}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<h2 class="card-title">Assign roles</h2>
						<form class="grid md:grid-cols-2 gap-2" on:submit|preventDefault={submitRoleAssignment}>
							<input class="input input-bordered" placeholder="User UID" bind:value={adminTargetUid} required />
							<input
								class="input input-bordered"
								placeholder="Roles (customer,designer,...)"
								bind:value={adminRoles}
								required />
							<button class="btn btn-primary md:col-span-2" type="submit" disabled={busy}>Apply roles</button>
						</form>
					</div>
				</div>
			{/if}
		{/if}

		{#if notice}
			<div class="alert">
				<span>{notice}</span>
			</div>
		{/if}
	{/if}
</div>
