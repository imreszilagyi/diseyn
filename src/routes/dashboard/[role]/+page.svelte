<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DesignerConceptsSection from '$lib/components/dashboard/DesignerConceptsSection.svelte';
	import ContractorCatalogSection from '$lib/components/dashboard/ContractorCatalogSection.svelte';
	import {
		listDesignCategories,
		listDesignSubcategories,
		listDesignerDesigns,
		listPublishedDesigns
	} from '$lib/services/designs';
	import { getManufacturerProfile, upsertManufacturerProfile } from '$lib/services/manufacturers';
	import {
		createOrder,
		listCustomerOrders,
		listManufacturerOrders,
		updateOrderStatus
	} from '$lib/services/orders';
	import { assignRoles } from '$lib/services/users';
	import { authLoading, authUser, switchActiveRole, userProfile } from '$lib/stores/auth';
	import type {
		DesignCategory,
		DesignItem,
		DesignSubcategory,
		ManufacturerProfile,
		Order,
		OrderStatus,
		UserRole
	} from '$lib/types/domain';

	const allRoles: UserRole[] = ['customer', 'manufacturer', 'designer', 'admin'];

	/** Tabs shown in “Switch role”; manufacturer is labeled Contractor. */
	function buildSwitchTabs(roles: UserRole[]): { role: UserRole; label: string }[] {
		const tabs: { role: UserRole; label: string }[] = [
			{ role: 'customer', label: 'Customer' },
			{ role: 'designer', label: 'Designer' },
			{ role: 'manufacturer', label: 'Contractor' }
		];
		if (roles.includes('admin')) {
			tabs.push({ role: 'admin', label: 'Admin' });
		}
		return tabs;
	}

	const activeRouteRole = $derived((($page.params.role as UserRole) || '') as UserRole | '');
	const allowedRoles = $derived(($userProfile?.roles ?? []) as UserRole[]);
	const switchTabs = $derived(buildSwitchTabs(allowedRoles));
	const isAuthorized = $derived(allowedRoles.includes(activeRouteRole as UserRole));
	const currentRole = $derived(activeRouteRole as UserRole);

	let customerOrders = $state<Order[]>([]);
	let manufacturerOrders = $state<Order[]>([]);
	let designerItems = $state<DesignItem[]>([]);
	let busy = $state(false);
	let notice = $state('');

	let orderDesignId = $state('');
	let orderManufacturerId = $state('');
	let orderCategories = $state<DesignCategory[]>([]);
	let orderSubcategories = $state<DesignSubcategory[]>([]);
	let orderDesignOptions = $state<DesignItem[]>([]);
	let orderCategoryId = $state('');
	let orderSubcategoryId = $state('');
	let manufacturerProfile = $state<ManufacturerProfile | null>(null);

	let supportedDesignTypes = $state('');
	let businessName = $state('');
	let city = $state('');
	let isAvailable = $state(true);

	let adminTargetUid = $state('');
	let adminRoles = $state('');

	onMount(() => {
		// Auth hydrates after first paint; reload role data when auth/profile become ready
		// or when switching roles, so designer lists are not stuck empty.
		const run = () => void initialize();
		run();
		const unsubs = [
			authLoading.subscribe(run),
			authUser.subscribe(run),
			userProfile.subscribe(run),
			page.subscribe(run)
		];
		return () => unsubs.forEach((u) => u());
	});

	async function initialize(): Promise<void> {
		if (get(authLoading)) return;
		const user = get(authUser);
		const profile = get(userProfile);
		const routeRole = (get(page).params.role as UserRole) || '';
		if (!user || !profile) return;
		if (!profile.roles.includes(routeRole)) return;
		await loadRoleData();
	}

	async function loadRoleData(): Promise<void> {
		const user = get(authUser);
		if (!user) return;
		const role = (get(page).params.role as UserRole) || '';

		if (role === 'customer') {
			const [orders, categories, subcategories] = await Promise.all([
				listCustomerOrders(user.uid),
				listDesignCategories(),
				listDesignSubcategories()
			]);
			customerOrders = orders;
			orderCategories = categories;
			orderSubcategories = subcategories;
			await loadOrderDesignOptions();
		}
		if (role === 'manufacturer') {
			const [orders, profile] = await Promise.all([
				listManufacturerOrders(user.uid),
				getManufacturerProfile(user.uid)
			]);
			manufacturerOrders = orders;
			manufacturerProfile = profile;
			supportedDesignTypes = (profile?.supportedDesignTypes ?? []).join(', ');
			businessName = profile?.businessName ?? '';
			city = profile?.city ?? '';
			isAvailable = profile?.isAvailable ?? true;
		}
		if (role === 'designer') {
			designerItems = await listDesignerDesigns(user.uid);
		}
	}

	const orderFilteredSubcategories = $derived(
		orderCategoryId
		? orderSubcategories.filter((item) => item.categoryId === orderCategoryId)
		: orderSubcategories
	);

	async function loadOrderDesignOptions(): Promise<void> {
		orderDesignOptions = await listPublishedDesigns({
			categoryId: orderCategoryId || undefined,
			subcategoryId: orderSubcategoryId || undefined,
			maxItems: 50
		});
		if (orderDesignId && !orderDesignOptions.some((item) => item.id === orderDesignId)) {
			orderDesignId = '';
		}
	}

	async function applyOrderDesignFilter(): Promise<void> {
		try {
			busy = true;
			notice = '';
			await loadOrderDesignOptions();
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Failed to load designs.';
		} finally {
			busy = false;
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
				<div role="tablist" class="tabs tabs-box tabs-sm flex-wrap">
					{#each switchTabs as { role, label } (role)}
						<button
							type="button"
							role="tab"
							class="tab"
							class:tab-active={role === currentRole}
							onclick={() => void handleRoleSwitch(role)}
							disabled={busy}
						>
							{label}
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
						<form
							onsubmit={(e) => {
								e.preventDefault();
								void submitOrder();
							}}
						>
							<fieldset class="fieldset gap-2 md:grid md:grid-cols-3">
								<legend class="fieldset-legend md:col-span-3">New order</legend>
								<select
									class="select select-bordered"
									bind:value={orderCategoryId}
									onchange={() => {
										if (
											orderSubcategoryId &&
											!orderFilteredSubcategories.some(
												(item) => item.id === orderSubcategoryId
											)
										) {
											orderSubcategoryId = '';
										}
										void applyOrderDesignFilter();
									}}
								>
									<option value="">All categories</option>
									{#each orderCategories as category (category.id)}
										<option value={category.id}>{category.name}</option>
									{/each}
								</select>
								<select
									class="select select-bordered"
									bind:value={orderSubcategoryId}
									onchange={() => void applyOrderDesignFilter()}
								>
									<option value="">All sub-categories</option>
									{#each orderFilteredSubcategories as subcategory (subcategory.id)}
										<option value={subcategory.id}>{subcategory.name}</option>
									{/each}
								</select>
								<select class="select select-bordered md:col-span-3" bind:value={orderDesignId} required>
									<option value="">Choose design</option>
									{#each orderDesignOptions as design (design.id)}
										<option value={design.id}>{design.title} ({design.designType})</option>
									{/each}
								</select>
								<input
									class="input input-bordered"
									placeholder="Manufacturer ID"
									bind:value={orderManufacturerId}
									required
								/>
								<button class="btn btn-primary" type="submit" class:loading={busy} disabled={busy}>Create order</button>
							</fieldset>
						</form>
						<div class="divider my-2"></div>
						<h3 class="font-semibold">My orders</h3>
						{#if customerOrders.length === 0}
							<p class="text-sm text-base-content/70">No orders yet.</p>
						{:else}
							<div class="overflow-x-auto rounded-box border border-base-300">
								<table class="table table-zebra table-sm">
									<thead>
										<tr>
											<th>Order</th>
											<th>Design</th>
											<th>Manufacturer</th>
											<th>Status</th>
										</tr>
									</thead>
									<tbody>
										{#each customerOrders as order (order.id)}
											<tr>
												<td class="font-mono text-xs">#{order.id}</td>
												<td>{order.designId}</td>
												<td class="max-w-[12rem] truncate" title={order.selectedManufacturerId}>
													{order.selectedManufacturerId}
												</td>
												<td><span class="badge badge-ghost badge-sm">{order.status}</span></td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if currentRole === 'manufacturer' && $authUser}
				<ContractorCatalogSection
					manufacturerId={$authUser.uid}
					initialProfile={manufacturerProfile}
				/>

				<div class="card bg-base-100 border border-base-300">
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
															onclick={() => void setOrderStatus(order.id, 'accepted')}
														>
															accept
														</button>
														<button
															type="button"
															class="btn btn-xs join-item"
															onclick={() => void setOrderStatus(order.id, 'in_production')}
														>
															production
														</button>
														<button
															type="button"
															class="btn btn-xs join-item"
															onclick={() => void setOrderStatus(order.id, 'ready')}
														>
															ready
														</button>
														<button
															type="button"
															class="btn btn-xs join-item"
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

						<div class="divider"></div>
						<h3 class="font-semibold">Supported design types</h3>
						<form
							onsubmit={(e) => {
								e.preventDefault();
								void saveManufacturerProfile();
							}}
						>
							<fieldset class="fieldset gap-2 md:grid md:grid-cols-2">
								<legend class="fieldset-legend md:col-span-2">Manufacturer profile</legend>
								<input class="input input-bordered" placeholder="Business name" bind:value={businessName} required />
								<input class="input input-bordered" placeholder="City" bind:value={city} required />
								<input
									class="input input-bordered md:col-span-2"
									placeholder="Supported types (comma separated)"
									bind:value={supportedDesignTypes}
									required
								/>
								<label class="label md:col-span-2 cursor-pointer justify-start gap-2">
									<input class="toggle toggle-primary" type="checkbox" bind:checked={isAvailable} />
									<span class="label-text">Available for new work</span>
								</label>
								<button class="btn btn-primary md:col-span-2" type="submit" class:loading={busy} disabled={busy}>
									Save profile
								</button>
							</fieldset>
						</form>
					</div>
				</div>
			{/if}

			{#if currentRole === 'designer' && $authUser}
				<DesignerConceptsSection
					designerId={$authUser.uid}
					items={designerItems}
					onRefresh={loadRoleData}
				/>
			{/if}

			{#if currentRole === 'admin'}
				<div class="card bg-base-100 border border-base-300">
					<div class="card-body">
						<h2 class="card-title">Assign roles</h2>
						<form
							onsubmit={(e) => {
								e.preventDefault();
								void submitRoleAssignment();
							}}
						>
							<fieldset class="fieldset gap-2 md:grid md:grid-cols-2">
								<legend class="fieldset-legend md:col-span-2">Assign roles</legend>
								<input class="input input-bordered" placeholder="User UID" bind:value={adminTargetUid} required />
								<input
									class="input input-bordered"
									placeholder="Roles (customer,designer,...)"
									bind:value={adminRoles}
									required
								/>
								<button class="btn btn-primary md:col-span-2" type="submit" class:loading={busy} disabled={busy}>
									Apply roles
								</button>
							</fieldset>
						</form>
					</div>
				</div>
			{/if}
		{/if}

		{#if notice}
			<div role="status" class="alert alert-info">
				<span>{notice}</span>
			</div>
		{/if}
	{/if}
</div>
