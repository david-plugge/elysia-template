import type { Cookie } from 'elysia';

export function readAndRemoveCookie<T>(cookie: Cookie<T>) {
	const value = cookie.value;
	cookie.remove();
	return value;
}
