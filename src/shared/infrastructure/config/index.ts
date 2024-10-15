import type { RedisOptions } from 'ioredis';
import type { Options as PostgresOptions, PostgresType } from 'postgres';
import { env } from '../env';
import type { SessionConfig } from '../session';
import type { AuthServiceConfig } from '@/auth/infrastructure/auth.service';

export const postgresConfig: PostgresOptions<Record<never, PostgresType>> = {
	host: env.POSTGRES_HOST,
	port: env.POSTGRES_PORT,
	database: env.POSTGRES_DATABASE,
	user: env.POSTGRES_USER,
	password: env.POSTGRES_PASSWORD,
};

export const redisConfig: RedisOptions = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
};

export const authConfig: AuthServiceConfig = {
	clientId: env.OAUTH_CLIENT_ID,
	authorizeEndpoint: new URL('/oauth/v2/authorize', env.OAUTH_URL).toString(),
	tokenEndpoint: new URL('/oauth/v2/token', env.OAUTH_URL).toString(),
	userInfoEndpoint: new URL('/oidc/v1/userinfo', env.OAUTH_URL).toString(),
	redirectUri: env.OAUTH_REDIRECT_URI,
	scopes: ['openid', 'profile'],
};

export const sessionConfig: SessionConfig = {
	keyPrefix: 'session:',
	maxAge: env.SESSION_MAX_AGE,
	cookieOptions: {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		domain: env.SESSION_COOKIE_DOMAIN,
		secure: env.SESSION_COOKIE_SECURE,
	},
};
