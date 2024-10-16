interface Bucket {
	count: number;
	refilledAt: number;
}

export class TokenBucketMemory<Key> {
	#max: number;
	#refillIntervalSeconds: number;
	#storage = new Map<Key, Bucket>();

	constructor(max: number, refillIntervalSeconds: number) {
		this.#max = max;
		this.#refillIntervalSeconds = refillIntervalSeconds;
	}

	public consume(key: Key, cost: number): boolean {
		let bucket = this.#storage.get(key);
		const now = Date.now();
		if (!bucket) {
			bucket = {
				count: this.#max - cost,
				refilledAt: now,
			};
			this.#storage.set(key, bucket);
			return true;
		}

		const refill = Math.floor(
			(now - bucket.refilledAt) / (this.#refillIntervalSeconds * 1000)
		);
		bucket.count = Math.min(bucket.count + refill, this.#max);
		bucket.refilledAt = now;
		if (bucket.count < cost) {
			return false;
		}
		bucket.count -= cost;
		this.#storage.set(key, bucket);
		return true;
	}
}
