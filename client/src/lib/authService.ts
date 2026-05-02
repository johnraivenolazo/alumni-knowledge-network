import { createAuth0Client, type Auth0Client, type User } from '@auth0/auth0-spa-js';
import { writable } from 'svelte/store';

export const user = writable<User | null>(null);
export const isAuthenticated = writable(false);
export const loading = writable(true);

let auth0: Auth0Client;

export async function initAuth() {
	if (!import.meta.env.VITE_AUTH0_DOMAIN || !import.meta.env.VITE_AUTH0_CLIENT_ID) {
		console.warn('Auth0 credentials missing. Authentication will be disabled.');
		loading.set(false);
		return;
	}

	auth0 = await createAuth0Client({
		domain: import.meta.env.VITE_AUTH0_DOMAIN,
		clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
		cacheLocation: 'localstorage',
		authorizationParams: {
			audience: import.meta.env.VITE_AUTH0_AUDIENCE,
			redirect_uri: window.location.origin
		}
	});

	// Check if we are returning from Auth0 redirect
	const query = window.location.search;
	if (query.includes('code=') && query.includes('state=')) {
		try {
			await auth0.handleRedirectCallback();
		} catch (e) {
			console.error('Auth0 redirect error:', e);
		} finally {
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}

	const isAuth = await auth0.isAuthenticated();
	isAuthenticated.set(isAuth);

	if (isAuth) {
		try {
			const { api } = await import('./api');
			const dbUser = await api.get('/users/me');
			user.set(dbUser);
		} catch (e) {
			console.error('Failed to sync user with backend:', e);
			const userData = await auth0.getUser();
			user.set(userData ?? null);
		}
	}

	loading.set(false);
}

export async function login() {
	await auth0.loginWithRedirect();
}

export async function logout() {
	await auth0.logout({ logoutParams: { returnTo: window.location.origin } });
}

export async function getToken() {
	return await auth0.getTokenSilently();
}
