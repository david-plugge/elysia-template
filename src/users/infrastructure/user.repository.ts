import type { Database } from '@/shared/infrastructure/database/database';
import { UserSchema, type User } from '../domain/user.type';
import { Value } from '@sinclair/typebox/value';
import Elysia, { t } from 'elysia';
import { DatabaseProvider } from '@/shared/infrastructure/database';

export class UserRepository {
	#db: Database;

	constructor(db: Database) {
		this.#db = db;
	}

	async createUser(user: User): Promise<User> {
		const data = Value.Parse(UserSchema, user);

		const rowList = await this.#db`
		INSERT INTO users (id, username)
		VALUES (${data.id}, ${data.username})
		RETURNING
			id,
			username
		`;

		return Value.Parse(t.Array(UserSchema), rowList[0]);
	}

	async listUsers(): Promise<User[]> {
		const rowList = await this.#db`
		SELECT
			id,
			username
		FROM users
		`;

		return Value.Parse(t.Array(UserSchema), rowList);
	}

	async searchUsersByUsername(username: User['username']): Promise<User[]> {
		const rowList = await this.#db`
		SELECT
			id,
			username
		FROM users
		WHERE
			username ilike ${`%${username}%`}
		`;

		return Value.Parse(t.Array(UserSchema), rowList);
	}

	async getUserById(id: User['id']): Promise<User | null> {
		const rowList = await this.#db`
		SELECT
			id,
			username
		FROM users
		WHERE id = ${id}
		`;

		if (rowList.length === 0) {
			return null;
		}
		return Value.Parse(UserSchema, rowList[0]);
	}

	async updateUser(user: User): Promise<User | null> {
		const data = Value.Parse(UserSchema, user);

		const rowList = await this.#db`
		UPDATE users
		SET
			username = ${data.username}
		WHERE id = ${data.id}
		RETURNING
			id,
			username
		`;

		if (rowList.length === 0) {
			return null;
		}
		return Value.Parse(UserSchema, rowList[0]);
	}

	async deleteUserById(id: User['id']): Promise<User | null> {
		const rowList = await this.#db`
		DELETE FROM users
		WHERE id = ${id}
		RETURNING
			id,
			username
		`;

		if (rowList.length === 0) {
			return null;
		}
		return Value.Parse(UserSchema, rowList[0]);
	}
}

export const UserRepositoryProvider = new Elysia({ name: 'user.repository' })
	.use(DatabaseProvider)
	.decorate(({ database }) => ({
		UserRepository: new UserRepository(database),
	}));
