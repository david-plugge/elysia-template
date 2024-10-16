import type Redis from 'ioredis';
import { throttlingScript } from './redis-scripts';

interface RedisWithThrottlingScript extends Redis {
	rateLimitThrottling(key: string, now: string): Promise<['0' | '1']>;
}

export class RedisThrottlingStrategy<Key extends string | number> {
	#redis: RedisWithThrottlingScript;
	#storagePrefix: string;

	constructor(redis: Redis, storagePrefix: string) {
		redis.defineCommand('rateLimitThrottling', {
			numberOfKeys: 1,
			lua: throttlingScript,
		});

		this.#redis = redis as RedisWithThrottlingScript;
		this.#storagePrefix = storagePrefix;
	}

	public async consume(key: Key): Promise<boolean> {
		const result = await this.#redis.rateLimitThrottling(
			`${this.#storagePrefix}:${key}`,
			Math.floor(Date.now() / 1000).toString(),
		);

		return Boolean(result[0]);
	}

	public async reset(key: Key): Promise<void> {
		await this.#redis.del(`${this.#storagePrefix}:${key}`);
	}
}
