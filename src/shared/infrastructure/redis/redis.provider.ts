import Elysia from 'elysia';
import { redis } from './redis';

export const RedisProvider = new Elysia({ name: 'redis' })
	.decorate({
		redis,
	})
	.onStop(async ({ decorator: { redis } }) => {
		await redis.quit();
	});
