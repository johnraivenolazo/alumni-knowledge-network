import { getToken } from './authService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path: string, method = 'GET', body?: any) {
	let token: string | null = null;
	try {
		token = await getToken();
	} catch (e) {
		// Not logged in or error
	}

	const headers: HeadersInit = {
		'Content-Type': 'application/json'
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ message: 'An error occurred' }));
		throw new Error(error.message || 'An error occurred');
	}

	return res.json();
}

export const api = {
	get: (path: string) => request(path),
	post: (path: string, body: any) => request(path, 'POST', body),
	patch: (path: string, body: any) => request(path, 'PATCH', body),
	delete: (path: string) => request(path, 'DELETE')
};
