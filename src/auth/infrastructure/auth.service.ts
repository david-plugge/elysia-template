import { OAuth2Client, generateCodeVerifier, generateState } from 'oslo/oauth2';
import Elysia from 'elysia';
import { authConfig } from '@/shared/infrastructure/config';

interface AuthUser {
	lastname: string;
	firstname: string;
	locale: string;
	name: string;
	username: string;
	id: string;
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	id_token: string;
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
	#client: OAuth2Client;
	#config: AuthServiceConfig;

	constructor(config: AuthServiceConfig) {
		this.#config = config;

		this.#client = new OAuth2Client(
			this.#config.clientId,
			this.#config.authorizeEndpoint,
			this.#config.tokenEndpoint,
			{
				redirectURI: config.redirectUri,
			},
		);
	}

	async getAuthorizationData() {
		const codeVerifier = generateCodeVerifier();
		const state = generateState();

		const url = await this.#client.createAuthorizationURL({
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
		const data = await this.#client.validateAuthorizationCode<TokenResponse>(
			code,
			{
				codeVerifier,
				authenticateWith: 'request_body',
			},
		);

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
}

export const AuthServiceProvider = new Elysia({
	name: 'service:auth',
}).decorate({
	AuthService: new AuthService(authConfig),
});
