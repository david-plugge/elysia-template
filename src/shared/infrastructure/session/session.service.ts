import { alphabet, generateRandomString } from 'oslo/crypto';
import type { Redis } from 'ioredis';
import { sessionConfig } from '@/shared/infrastructure/config';
import Elysia, { error, type Cookie, type CookieOptions } from 'elysia';
import { RedisProvider } from '../redis';
import { UserRepositoryProvider } from '@/users/infrastructure/user.repository';

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

	static generateSessionId() {
		return generateRandomString(16, alphabet('0-9', 'a-z', 'A-Z'));
	}
}

class RequestSession {
	#sessionCookie: Cookie<string | undefined>;
	#service: SessionService;
	#session: Session | null = null;
	#cookieOptions: CookieOptions;

	constructor(
		sessionCookie: Cookie<string | undefined>,
		service: SessionService,
		cookieOptions: CookieOptions,
	) {
		this.#sessionCookie = sessionCookie;
		this.#service = service;
		this.#cookieOptions = cookieOptions;
	}

	get id() {
		return this.#sessionCookie.value;
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
		if (!this.id) {
			return null;
		}

		if (this.#session) {
			return this.#session;
		}

		const session = await this.#service.getSessionById(this.id);

		if (!session) {
			this.#clearCookie();
		}

		this.#session = session;
		return this.#session;
	}

	#clearCookie() {
		this.#sessionCookie.set({
			...this.#cookieOptions,
			value: '',
			maxAge: -1,
		});
	}

	async delete() {
		if (this.id) {
			await this.#service.deleteSession(this.id);
			this.#clearCookie();
		}
	}

	async set(session: Session) {
		let id = this.id;

		if (!id) {
			id = SessionService.generateSessionId();
			this.#sessionCookie.set({
				...this.#cookieOptions,
				value: id,
			});
		}

		this.#session = null;
		await this.#service.setSession(id, session);
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
	.use(UserRepositoryProvider)
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
