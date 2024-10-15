import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import { cors } from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import { serverTiming } from '@elysiajs/server-timing';

import { router } from './routes';

export const app = new Elysia()
	.use(serverTiming())
	.use(cors({ origin: true }))
	.use(logger({ autoLogging: true }))
	.use(
		swagger({
			path: '/docs',
			provider: 'scalar',
			documentation: {
				info: {
					title: 'Elysia API',
					version: '1.0.0',
				},
				tags: [
					{
						name: 'user',
					},
					{
						name: 'post',
					},
				],
			},
		}),
	)
	.use(router);
