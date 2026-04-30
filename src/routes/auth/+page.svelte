<script lang="ts">
	import { browser } from '$app/environment';
	import {
		type ActionCodeSettings,
		GoogleAuthProvider,
		isSignInWithEmailLink,
		sendSignInLinkToEmail,
		signInWithEmailLink,
		signInWithPopup,
		signInWithRedirect
	} from 'firebase/auth';
	import { auth } from '$lib/firebase/client';
	import { authUser, logout } from '$lib/stores/auth';

	const emailStorageKey = 'diseyn_auth_email_for_link';
	let email = '';
	let loading = false;
	let message = '';
	const googleProvider = new GoogleAuthProvider();
	googleProvider.setCustomParameters({ prompt: 'select_account' });

	function getActivationSettings(): ActionCodeSettings {
		if (!browser) {
			throw new Error('Activation link is only available in the browser.');
		}

		return {
			url: `${window.location.origin}/auth`,
			handleCodeInApp: true
		};
	}

	if (browser) {
		const savedEmail = window.localStorage.getItem(emailStorageKey);
		if (savedEmail) {
			email = savedEmail;
		}
		void completeEmailLinkSignIn();
	}

	async function sendActivationLink(targetEmail: string): Promise<void> {
		if (!auth) {
			throw new Error('Authentication is temporarily unavailable. Please try again in a moment.');
		}

		await sendSignInLinkToEmail(auth, targetEmail, getActivationSettings());
		if (browser) {
			window.localStorage.setItem(emailStorageKey, targetEmail);
		}
	}

	async function completeEmailLinkSignIn(): Promise<void> {
		if (!browser || !auth) return;
		if (!isSignInWithEmailLink(auth, window.location.href)) return;

		loading = true;
		message = '';
		try {
			const storedEmail = window.localStorage.getItem(emailStorageKey);
			const emailForLink =
				storedEmail || window.prompt('Confirm your email address to complete sign-in') || '';

			if (!emailForLink) {
				message = 'Could not complete sign-in from activation link: email is required.';
				return;
			}

			await signInWithEmailLink(auth, emailForLink, window.location.href);
			window.localStorage.removeItem(emailStorageKey);
			message = 'Signed in successfully with activation link.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Activation-link sign-in failed.';
		} finally {
			loading = false;
		}
	}

	async function submitActivationLink(): Promise<void> {
		loading = true;
		message = '';
		try {
			const normalizedEmail = email.trim().toLowerCase();
			if (!normalizedEmail) {
				message = 'Please provide your email address.';
				return;
			}

			await sendActivationLink(normalizedEmail);
			message = 'Activation link sent. Check your inbox to continue sign-in.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Failed to send activation link.';
		} finally {
			loading = false;
		}
	}

	async function handleGoogleLogin(): Promise<void> {
		loading = true;
		message = '';
		try {
			if (!auth) {
				message = 'Authentication is temporarily unavailable. Please try again in a moment.';
				return;
			}

			try {
				await signInWithPopup(auth, googleProvider);
			} catch (popupError) {
				if (popupError instanceof Error && popupError.message.toLowerCase().includes('popup')) {
					await signInWithRedirect(auth, googleProvider);
					return;
				}
				throw popupError;
			}
			message = 'Signed in with Google.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Google sign-in failed.';
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
			<p class="text-sm text-base-content/70">
				Use an email activation link or Google to sign in with Firebase Authentication.
			</p>
			<div class="alert alert-info mt-2">
				<span>Enter your email, then open the activation link from your inbox to complete sign-in.</span>
			</div>

			<form class="space-y-3 mt-3" on:submit|preventDefault={submitActivationLink}>
				<label class="form-control">
					<span class="label-text">Email</span>
					<input class="input input-bordered" type="email" bind:value={email} required />
				</label>
				<button class="btn btn-primary w-full" type="submit" disabled={loading}>
					{#if loading}Working...{:else}Send activation link{/if}
				</button>
			</form>

			<div class="divider my-2">or</div>
			<button class="btn btn-outline w-full" type="button" on:click={handleGoogleLogin} disabled={loading}>
				Continue with Google
			</button>

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
