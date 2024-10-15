import { AssertError, Value } from '@sinclair/typebox/value';
import { t } from 'elysia';

const envSchema = t.Object({
	// general
	HOST: t.String({ format: 'hostname', default: 'localhost' }),
	PORT: t.Numeric({ default: 3000 }),
	ORIGIN: t.String(),
	BASE_PATH: t.String({ default: '/' }),
	LOG_LEVEL: t.UnionEnum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'], {
		default: 'warn',
	}),

	// database
	POSTGRES_HOST: t.String(),
	POSTGRES_PORT: t.Numeric(),
	POSTGRES_DATABASE: t.String(),
	POSTGRES_USER: t.String(),
	POSTGRES_PASSWORD: t.String(),

	// redis
	REDIS_HOST: t.String(),
	REDIS_PORT: t.Numeric(),

	// auth
	OAUTH_CLIENT_ID: t.String(),
	OAUTH_URL: t.String(),
	OAUTH_REDIRECT_URI: t.String(),

	// session
	SESSION_MAX_AGE: t.Numeric(),
	SESSION_COOKIE_DOMAIN: t.String(),
	SESSION_COOKIE_SECURE: t.BooleanString(),
});

export const env = parseEnv();

function parseEnv() {
	try {
		return Value.Parse(envSchema, process.env);
	} catch (err) {
		if (err instanceof AssertError) {
			for (const error of err.Errors()) {
				console.error(
					`ENV: "${error.path.slice(1)}" ${error.message} - received ${error.value}`,
				);
			}
		} else {
			console.error('ENV: unknown error');
		}
		process.exit(1);
	}
}
