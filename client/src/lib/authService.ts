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
		authorizationParams: {
			audience: import.meta.env.VITE_AUTH0_AUDIENCE,
			redirect_uri: window.location.origin
		}
	});

	const isAuth = await auth0.isAuthenticated();
	isAuthenticated.set(isAuth);

	if (isAuth) {
		const userData = await auth0.getUser();
		user.set(userData);
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
