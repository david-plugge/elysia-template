import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import { cors } from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import { serverTiming } from '@elysiajs/server-timing';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

import { router } from './routes';

export const app = new Elysia()
	.use(serverTiming())
	.use(
		opentelemetry({
			serviceName: 'elysia-api',
			spanProcessors: [
				new BatchSpanProcessor(
					new OTLPTraceExporter({
						url: 'http://localhost:4318/v1/traces',
					}),
				),
			],
		}),
	)
	.use(cors({ origin: true }))
	.use(
		logger({
			autoLogging: true,
			customProps(ctx) {
				return {
					response: {
						status: ctx.set.status,
					},
				};
			},
		}),
	)
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
