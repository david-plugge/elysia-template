import type Redis from 'ioredis';
import tocketBucketScript from './token-bucket.lua' with { type: 'text' };

interface RedisWithTokenBucketScript extends Redis {
	rateLimitTokenBucket(keys: string[], args: string[]): Promise<[0 | 1]>;
}

export class TokenBucketRedis {
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
			numberOfKeys: 4,
			lua: tocketBucketScript,
		});

		this.#redis = redis as RedisWithTokenBucketScript;
		this.#storagePrefix = storagePrefix;
		this.#max = max;
		this.#refillIntervalSeconds = refillIntervalSeconds;
	}

	public async consume(key: string, cost: number): Promise<boolean> {
		const result = await this.#redis.rateLimitTokenBucket(
			[`${this.#storagePrefix}:${key}`],
			[
				this.#max.toString(),
				this.#refillIntervalSeconds.toString(),
				cost.toString(),
				Math.floor(Date.now() / 1000).toString(),
			],
		);

		return Boolean(result[0]);
	}
}
