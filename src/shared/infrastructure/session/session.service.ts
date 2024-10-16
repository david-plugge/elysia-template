import type { Redis } from 'ioredis';
import { sessionConfig } from '@/shared/infrastructure/config';
import Elysia, { error, type Cookie, type CookieOptions } from 'elysia';
import { RedisProvider } from '../redis';
import { generateSessionToken, sessionTokenToId } from './utils';

export interface Session {
	userId: string;
}

export interface SessionServiceConfig {
	keyPrefix: string;
	maxAge: number;
}

export class SessionService {
	#config: SessionServiceConfig;
	#cache: Redis;

	constructor(cache: Redis, config: SessionServiceConfig) {
		this.#cache = cache;
		this.#config = config;
	}

	#buildId(sessionId: string) {
		return this.#config.keyPrefix + sessionId;
	}

	async getSessionById(sessionId: string) {
		try {
			const value = await this.#cache.get(this.#buildId(sessionId));
			if (!value) {
				return null;
			}
			const session: Session = JSON.parse(value);
			return session;
		} catch (err) {
			return null;
		}
	}

	async setSession(sessionId: string, session: Session) {
		const value = JSON.stringify(session);
		await this.#cache.set(
			this.#buildId(sessionId),
			value,
			'EX',
			this.#config.maxAge,
		);
	}

	async deleteSession(sessionId: string) {
		await this.#cache.del(this.#buildId(sessionId));
	}
}

class RequestSession {
	#sessionTokenCookie: Cookie<string | undefined>;
	#service: SessionService;
	#session: Session | null = null;
	#cookieOptions: CookieOptions;

	constructor(
		sessionCookie: Cookie<string | undefined>,
		service: SessionService,
		cookieOptions: CookieOptions,
	) {
		this.#sessionTokenCookie = sessionCookie;
		this.#service = service;
		this.#cookieOptions = cookieOptions;
	}

	get token() {
		return this.#sessionTokenCookie.value;
	}

	async validate(): Promise<Session> {
		const session = await this.get();
		if (!session) {
			throw error(401, {
				status: 'error',
				message: 'Unauthorized',
			});
		}
		return session;
	}

	async get() {
		if (this.#session) {
			return this.#session;
		}

		if (!this.token) {
			return null;
		}

		const sessionId = sessionTokenToId(this.token);
		const session = await this.#service.getSessionById(sessionId);

		if (!session) {
			this.#clearCookie();
		}

		this.#session = session;
		return this.#session;
	}

	#clearCookie() {
		this.#sessionTokenCookie.set({
			...this.#cookieOptions,
			value: '',
			maxAge: -1,
		});
	}

	async delete() {
		if (this.token) {
			const sessionId = sessionTokenToId(this.token);
			await this.#service.deleteSession(sessionId);
			this.#clearCookie();
		}
	}

	async set(session: Session) {
		let token = this.token;

		if (!token) {
			token = generateSessionToken();
			this.#sessionTokenCookie.set({
				...this.#cookieOptions,
				value: token,
			});
		}

		const sessionId = sessionTokenToId(token);
		this.#session = null;
		await this.#service.setSession(sessionId, session);
	}
}

export interface SessionConfig {
	keyPrefix: string;
	maxAge: number;
	cookieOptions: Omit<CookieOptions, 'maxAge' | 'expires'>;
}

export const SessionServiceProvider = new Elysia({ name: 'service:session' })
	.use(RedisProvider)
	.decorate(({ redis }) => ({
		SessionService: new SessionService(redis, {
			keyPrefix: sessionConfig.keyPrefix,
			maxAge: sessionConfig.maxAge,
		}),
	}))
	.derive(
		{ as: 'global' },
		async function createRequestSession({
			cookie: { session_id },
			SessionService,
		}) {
			const Session = new RequestSession(session_id, SessionService, {
				...sessionConfig.cookieOptions,
				maxAge: sessionConfig.maxAge,
			});

			return {
				Session,
			};
		},
	)
	.macro(({ onBeforeHandle }) => ({
		isValidSession(value: boolean) {
			onBeforeHandle(async ({ Session, error }) => {
				if (value) {
					const session = await Session.get();
					if (!session) {
						return error(401);
					}
				}
			});
		},
	}))
	.as('plugin');
