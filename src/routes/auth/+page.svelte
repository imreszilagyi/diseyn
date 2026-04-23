<script lang="ts">
	import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase/client';
	import { authUser, logout } from '$lib/stores/auth';

	let email = '';
	let password = '';
	let loading = false;
	let mode: 'login' | 'signup' = 'login';
	let message = '';

	async function submitAuth(): Promise<void> {
		loading = true;
		message = '';
		try {
			if (!auth) {
				message = 'Authentication is temporarily unavailable. Please try again in a moment.';
				return;
			}

			if (mode === 'login') {
				await signInWithEmailAndPassword(auth, email, password);
				message = 'Signed in successfully.';
			} else {
				await createUserWithEmailAndPassword(auth, email, password);
				message = 'Account created successfully.';
			}
		} catch (error) {
			message = error instanceof Error ? error.message : 'Authentication failed.';
		} finally {
			loading = false;
		}
	}

	async function handleLogout(): Promise<void> {
		loading = true;
		message = '';
		try {
			await logout();
			message = 'Signed out.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Logout failed.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-xl mx-auto space-y-4">
	<div class="card bg-base-100 border border-base-300">
		<div class="card-body">
			<h1 class="card-title text-2xl">Authentication</h1>
			<p class="text-sm text-base-content/70">Use email/password to sign in or create an account.</p>

			<div class="join w-full mt-2">
				<button
					class="btn join-item flex-1"
					class:btn-primary={mode === 'login'}
					on:click={() => (mode = 'login')}
					type="button">Login</button
				>
				<button
					class="btn join-item flex-1"
					class:btn-primary={mode === 'signup'}
					on:click={() => (mode = 'signup')}
					type="button">Sign up</button
				>
			</div>

			<form class="space-y-3 mt-3" on:submit|preventDefault={submitAuth}>
				<label class="form-control">
					<span class="label-text">Email</span>
					<input class="input input-bordered" type="email" bind:value={email} required />
				</label>
				<label class="form-control">
					<span class="label-text">Password</span>
					<input class="input input-bordered" type="password" bind:value={password} required minlength="6" />
				</label>
				<button class="btn btn-primary w-full" type="submit" disabled={loading}>
					{#if loading}Working...{:else if mode === 'login'}Login{:else}Create account{/if}
				</button>
			</form>

			{#if message}
				<div class="alert mt-2">
					<span>{message}</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="card bg-base-100 border border-base-300">
		<div class="card-body">
			<h2 class="card-title text-lg">Session</h2>
			{#if $authUser}
				<p class="text-sm">Logged in as {$authUser.email}</p>
				<button class="btn btn-outline" type="button" on:click={handleLogout} disabled={loading}>
					Logout
				</button>
			{:else}
				<p class="text-sm text-base-content/70">No active session.</p>
			{/if}
		</div>
	</div>
</div>
