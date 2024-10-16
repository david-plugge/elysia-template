import { TokenRequestResult } from '@oslojs/oauth2';
import Elysia from 'elysia';
import { authConfig } from '@/shared/infrastructure/config';
import { encodeBase64, encodeBase64NoPadding } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

interface AuthUser {
	lastname: string;
	firstname: string;
	locale: string;
	name: string;
	username: string;
	id: string;
}

export interface AuthServiceConfig {
	clientId: string;
	authorizeEndpoint: string;
	tokenEndpoint: string;
	userInfoEndpoint: string;
	redirectUri?: string;
	scopes?: string[];
}

export class AuthService {
	#config: AuthServiceConfig;

	constructor(config: AuthServiceConfig) {
		this.#config = config;
	}

	async getAuthorizationData() {
		const codeVerifier = generateRandomString();
		const state = generateRandomString();

		const url = await this.#createAuthorizationURL({
			state,
			codeVerifier,
			scopes: this.#config.scopes,
		});

		return {
			codeVerifier,
			state,
			url,
		};
	}

	async verifyAuthorizationCode(code: string, codeVerifier: string) {
		const data = await this.#validateAuthorizationCode(code, {
			codeVerifier,
			authenticateWith: 'request_body',
		});

		return data;
	}

	async getUser(accessToken: string): Promise<AuthUser> {
		const response = await fetch(this.#config.userInfoEndpoint, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error('Failed to retrieve userinfo');
		}

		const user: {
			sub: string;
			name: string;
			given_name: string;
			family_name: string;
			locale: string;
			preferred_username: string;
			updated_at: number;
		} = await response.json();

		return {
			id: user.sub,
			firstname: user.given_name,
			lastname: user.family_name,
			name: user.name,
			username: user.preferred_username,
			locale: user.locale,
		};
	}

	#createAuthorizationURL(options: {
		state?: string;
		codeVerifier?: string;
		codeChallengeMethod?: 'S256' | 'plain';
		scopes?: string[];
	}) {
		const scopes = Array.from(new Set(options.scopes ?? []));
		const authorizationUrl = new URL(this.#config.authorizeEndpoint);
		authorizationUrl.searchParams.set('response_type', 'code');
		authorizationUrl.searchParams.set('client_id', this.#config.clientId);
		if (options.state !== undefined) {
			authorizationUrl.searchParams.set('state', options.state);
		}
		if (scopes.length > 0) {
			authorizationUrl.searchParams.set('scope', scopes.join(' '));
		}
		if (this.#config.redirectUri !== undefined) {
			authorizationUrl.searchParams.set(
				'redirect_uri',
				this.#config.redirectUri,
			);
		}
		if (options.codeVerifier !== undefined) {
			const codeChallengeMethod = options.codeChallengeMethod ?? 'S256';
			if (codeChallengeMethod === 'S256') {
				const codeChallengeBuffer = sha256(
					new TextEncoder().encode(options.codeVerifier),
				);
				const codeChallenge = encodeBase64NoPadding(codeChallengeBuffer);
				authorizationUrl.searchParams.set('code_challenge', codeChallenge);
				authorizationUrl.searchParams.set('code_challenge_method', 'S256');
			} else if (codeChallengeMethod === 'plain') {
				authorizationUrl.searchParams.set(
					'code_challenge',
					options.codeVerifier,
				);
				authorizationUrl.searchParams.set('code_challenge_method', 'plain');
			} else {
				throw new TypeError(
					`Invalid value for 'codeChallengeMethod': ${codeChallengeMethod}`,
				);
			}
		}
		return authorizationUrl;
	}

	async #validateAuthorizationCode(
		authorizationCode: string,
		options?: {
			codeVerifier?: string;
			credentials?: string;
			authenticateWith?: 'http_basic_auth' | 'request_body';
		},
	) {
		const body = new URLSearchParams();
		body.set('code', authorizationCode);
		body.set('client_id', this.#config.clientId);
		body.set('grant_type', 'authorization_code');

		if (this.#config.redirectUri !== undefined) {
			body.set('redirect_uri', this.#config.redirectUri);
		}
		if (options?.codeVerifier !== undefined) {
			body.set('code_verifier', options.codeVerifier);
		}
		return await this.#sendTokenRequest(body, options);
	}

	async #sendTokenRequest(
		body: URLSearchParams,
		options?: {
			credentials?: string;
			authenticateWith?: 'http_basic_auth' | 'request_body';
		},
	) {
		const headers = new Headers();
		headers.set('Content-Type', 'application/x-www-form-urlencoded');
		headers.set('Accept', 'application/json');
		headers.set('User-Agent', 'oslo');

		if (options?.credentials !== undefined) {
			const authenticateWith = options?.authenticateWith ?? 'http_basic_auth';
			if (authenticateWith === 'http_basic_auth') {
				const encodedCredentials = encodeBase64(
					new TextEncoder().encode(
						`${this.#config.clientId}:${options.credentials}`,
					),
				);
				headers.set('Authorization', `Basic ${encodedCredentials}`);
			} else if (authenticateWith === 'request_body') {
				body.set('client_secret', options.credentials);
			} else {
				throw new TypeError(
					`Invalid value for 'authenticateWith': ${authenticateWith}`,
				);
			}
		}

		const request = new Request(this.#config.tokenEndpoint, {
			method: 'POST',
			headers,
			body,
		});
		const response = await fetch(request);
		const data = await response.json();
		if (typeof data !== 'object' || data === null) {
			throw new Error('Unexpected response');
		}

		const result = new TokenRequestResult(data);
		if (result.hasErrorCode()) {
			const error = result.errorCode();
			throw new Error(`Request failed: ${error}`);
		}

		const accessToken = result.accessToken();
		const accessTokenExpiresAt = result.accessTokenExpiresAt();

		return {
			accessToken,
			accessTokenExpiresAt,
		};
	}
}

export const AuthServiceProvider = new Elysia({
	name: 'service:auth',
}).decorate({
	AuthService: new AuthService(authConfig),
});

function generateRandomString() {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	const token = encodeBase64NoPadding(tokenBytes);
	return token;
}
