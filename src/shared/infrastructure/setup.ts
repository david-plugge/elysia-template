import { logger } from '@bogeychan/elysia-logger';
import Elysia, { t } from 'elysia';
import { env } from './env';

export const setup = new Elysia({ name: 'setup' })
	.use(
		logger({
			autoLogging: false,
			level: env.LOG_LEVEL,
		}),
	)
	.model({
		error: t.Object({
			status: t.String(),
			message: t.String(),
		}),
	});
