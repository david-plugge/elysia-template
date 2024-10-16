import type Redis from 'ioredis';
import { tokenBucketScript } from './redis-scripts';

interface RedisWithTokenBucketScript extends Redis {
	rateLimitTokenBucket(
		key: string,
		max: string,
		refillIntervalSeconds: string,
		cost: string,
		now: string,
	): Promise<['0' | '1']>;
}

export class RedisTokenBucketStrategy<Key extends string | number> {
	#redis: RedisWithTokenBucketScript;
	#storagePrefix: string;
	#max: number;
	#refillIntervalSeconds: number;

	constructor(
		redis: Redis,
		storagePrefix: string,
		max: number,
		refillIntervalSeconds: number,
	) {
		redis.defineCommand('rateLimitTokenBucket', {
			numberOfKeys: 1,
			lua: tokenBucketScript,
		});

		this.#redis = redis as RedisWithTokenBucketScript;
		this.#storagePrefix = storagePrefix;
		this.#max = max;
		this.#refillIntervalSeconds = refillIntervalSeconds;
	}

	public async consume(key: Key, cost: number): Promise<boolean> {
		const result = await this.#redis.rateLimitTokenBucket(
			`${this.#storagePrefix}:${key}`,
			this.#max.toString(),
			this.#refillIntervalSeconds.toString(),
			cost.toString(),
			Math.floor(Date.now() / 1000).toString(),
		);

		return Boolean(result[0]);
	}

	public async reset(key: Key): Promise<void> {
		await this.#redis.del(`${this.#storagePrefix}:${key}`);
	}
}
