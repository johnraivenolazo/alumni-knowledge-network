// Pure SPA: Auth0 SPA SDK requires `window`, and the app calls the backend at
// runtime, so prerendering and SSR are both disabled. SvelteKit ships a single
// fallback HTML and lets the browser take over.
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'never';
