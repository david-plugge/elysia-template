export interface Strategy<Key> {
	consume(key: Key): Promise<boolean>;
}
