<script lang="ts">
	import { browser } from '$app/environment';
	import {
		type ActionCodeSettings,
		GoogleAuthProvider,
		createUserWithEmailAndPassword,
		isSignInWithEmailLink,
		sendEmailVerification,
		sendSignInLinkToEmail,
		signInWithEmailAndPassword,
		signInWithEmailLink,
		signInWithPopup,
		signInWithRedirect,
		type User
	} from 'firebase/auth';
	import { auth } from '$lib/firebase/client';
	import { authUser, logout } from '$lib/stores/auth';

	const emailStorageKey = 'diseyn_auth_email_for_link';
	let email = '';
	let password = '';
	let loading = false;
	let message = '';
	/** Password form: login vs register */
	let passwordMode: 'login' | 'signup' = 'login';
	/** Top-level: magic link vs password */
	let authMethod: 'link' | 'password' = 'password';

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

	async function sendVerificationEmail(user: User): Promise<void> {
		await sendEmailVerification(user, getActivationSettings());
	}

	function firebaseAuthCode(error: unknown): string | undefined {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			const code = (error as { code: unknown }).code;
			return typeof code === 'string' ? code : undefined;
		}
		return undefined;
	}

	function passwordAuthErrorMessage(error: unknown, mode: 'login' | 'signup'): string {
		const code = firebaseAuthCode(error);
		switch (code) {
			case 'auth/user-not-found':
			case 'auth/wrong-password':
			case 'auth/invalid-credential':
				return mode === 'login'
					? 'Email or password is wrong, or there is no password account for this email. Try Register, Email link, or Google.'
					: 'Could not create this account. Try a different email or sign in if you already have one.';
			case 'auth/invalid-email':
				return 'That email address does not look valid. Check for typos.';
			case 'auth/user-disabled':
				return 'This account has been disabled. Contact support if you think this is a mistake.';
			case 'auth/too-many-requests':
				return 'Too many attempts. Wait a few minutes and try again.';
			case 'auth/network-request-failed':
				return 'Network error. Check your connection and try again.';
			case 'auth/operation-not-allowed':
				return 'Email/password sign-in is not enabled for this project in the Firebase console.';
			case 'auth/email-already-in-use':
				return 'An account already exists with this email. Use Login or Google.';
			case 'auth/weak-password':
				return 'Password is too weak. Use at least 6 characters (longer is better).';
			case 'auth/invalid-password':
				return 'Invalid password. Check length and try again.';
			default:
				if (error instanceof Error && error.message) {
					return error.message;
				}
				return mode === 'login' ? 'Sign-in failed.' : 'Registration failed.';
		}
	}

	async function submitPasswordAuth(): Promise<void> {
		loading = true;
		message = '';
		try {
			if (!auth) {
				message = 'Authentication is temporarily unavailable. Please try again in a moment.';
				return;
			}

			const normalizedEmail = email.trim().toLowerCase();
			if (!normalizedEmail) {
				message = 'Please provide your email address.';
				return;
			}

			if (passwordMode === 'login') {
				const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
				message = credential.user.emailVerified
					? 'Signed in successfully.'
					: 'Signed in. Please verify your email using the link we sent (check inbox or resend below).';
			} else {
				const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
				await sendVerificationEmail(credential.user);
				message = 'Account created. Check your email for the verification link to activate your account.';
			}
		} catch (error) {
			message = passwordAuthErrorMessage(error, passwordMode);
		} finally {
			loading = false;
		}
	}

	async function resendVerificationEmail(): Promise<void> {
		loading = true;
		message = '';
		try {
			if (!$authUser) {
				message = 'No active user found.';
				return;
			}
			if ($authUser.emailVerified) {
				message = 'Your email is already verified.';
				return;
			}
			await sendVerificationEmail($authUser);
			message = 'Verification link sent again. Please check your inbox.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Could not resend verification email.';
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

<div class="mx-auto max-w-xl space-y-4">
	{#if !$authUser}
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body">
				<h1 class="card-title text-2xl">Authentication</h1>
				<p class="text-sm text-base-content/70">
					Sign in with email and password, a one-time email link, or Google (Firebase Authentication).
				</p>

				<div role="tablist" class="tabs tabs-box mt-3 w-full">
				<button
					role="tab"
					type="button"
					class="tab flex-1"
					class:tab-active={authMethod === 'password'}
					onclick={() => (authMethod = 'password')}
				>
					Email & password
				</button>
				<button
					role="tab"
					type="button"
					class="tab flex-1"
					class:tab-active={authMethod === 'link'}
					onclick={() => (authMethod = 'link')}
				>
					Email link
				</button>
			</div>

			{#if authMethod === 'password'}
				<div role="tablist" class="tabs tabs-border mt-2 w-full">
					<button
						role="tab"
						type="button"
						class="tab flex-1"
						class:tab-active={passwordMode === 'login'}
						onclick={() => (passwordMode = 'login')}
					>
						Login
					</button>
					<button
						role="tab"
						type="button"
						class="tab flex-1"
						class:tab-active={passwordMode === 'signup'}
						onclick={() => (passwordMode = 'signup')}
					>
						Register
					</button>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						void submitPasswordAuth();
					}}
				>
					<fieldset class="fieldset mt-3 gap-2">
						<legend class="fieldset-legend">
							{passwordMode === 'login' ? 'Sign in' : 'Create account'}
						</legend>
						<label class="label" for="auth-email-password">
							<span class="label-text">Email</span>
						</label>
						<input
							id="auth-email-password"
							class="input input-bordered w-full"
							type="email"
							bind:value={email}
							required
						/>
						<label class="label" for="auth-password">
							<span class="label-text">Password</span>
						</label>
						<input
							id="auth-password"
							class="input input-bordered w-full"
							type="password"
							bind:value={password}
							required
							minlength="6"
						/>
						<button class="btn btn-primary mt-2 w-full" class:loading type="submit" disabled={loading}>
							{#if passwordMode === 'login'}
								Login
							{:else}
								Create account
							{/if}
						</button>
					</fieldset>
				</form>
			{:else}
				<div role="alert" class="alert alert-info mt-3">
					<span>No password needed — we email you a sign-in link.</span>
				</div>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						void submitActivationLink();
					}}
				>
					<fieldset class="fieldset mt-2 gap-2">
						<legend class="fieldset-legend">Email link</legend>
						<label class="label" for="auth-email-link">
							<span class="label-text">Email</span>
						</label>
						<input
							id="auth-email-link"
							class="input input-bordered w-full"
							type="email"
							bind:value={email}
							required
						/>
						<button class="btn btn-primary mt-2 w-full" class:loading type="submit" disabled={loading}>
							Send sign-in link
						</button>
					</fieldset>
				</form>
			{/if}

			<div class="divider my-2">or</div>
			<button
				class="btn btn-outline w-full"
				class:loading
				type="button"
				onclick={() => void handleGoogleLogin()}
				disabled={loading}
			>
				Continue with Google
			</button>

				{#if message}
					<div role="status" class="alert alert-warning mt-2">
						<span>{message}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="card border border-base-300 bg-base-100">
		<div class="card-body">
			<h2 class="card-title text-lg">Session</h2>
			{#if $authUser}
				{#if message}
					<div role="status" class="alert alert-warning mb-3">
						<span>{message}</span>
					</div>
				{/if}
				<ul class="list mt-1 rounded-box border border-base-300 bg-base-200/40">
					<li class="list-row">
						<div class="list-col-grow">
							<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Signed in as</div>
							<div class="text-sm">{$authUser.email}</div>
						</div>
					</li>
				</ul>
				{#if !$authUser.emailVerified}
					<div role="alert" class="alert alert-warning mt-3">
						<span>Email not verified yet.</span>
					</div>
					<button
						class="btn btn-warning btn-sm mt-2"
						type="button"
						onclick={() => void resendVerificationEmail()}
						disabled={loading}
					>
						Resend verification link
					</button>
				{/if}
				<div class="card-actions mt-3">
					<button
						class="btn btn-outline"
						class:loading
						type="button"
						onclick={() => void handleLogout()}
						disabled={loading}
					>
						Logout
					</button>
				</div>
			{:else}
				<p class="text-sm text-base-content/70">No active session.</p>
			{/if}
		</div>
	</div>
</div>
