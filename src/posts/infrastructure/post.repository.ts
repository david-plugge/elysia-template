import type { Database } from '@/shared/infrastructure/database/database';
import { PostSchema, type Post } from '../domain/post.type';
import { Value } from '@sinclair/typebox/value';
import Elysia, { t } from 'elysia';
import { DatabaseProvider } from '@/shared/infrastructure/database';

export class PostRepository {
	#db: Database;

	constructor(db: Database) {
		this.#db = db;
	}

	async createPost(user: Post): Promise<Post> {
		const data = Value.Parse(PostSchema, user);

		const rowList = await this.#db`
		INSERT INTO posts (
			id,
			title,
			body,
			date
		)
		VALUES (${data.id}, ${data.title}, ${data.body}, ${data.date.toISOString()})
		RETURNING
			id,
			title,
			body,
			date
		`;

		return Value.Parse(t.Array(PostSchema), rowList);
	}

	async listPosts(): Promise<Post[]> {
		const rowList = await this.#db`
		SELECT
			id,
			title,
			body,
			date
		FROM posts
		`;

		return Value.Parse(t.Array(PostSchema), rowList);
	}

	async searchPostsByTitle(title: Post['title']): Promise<Post[]> {
		const rowList = await this.#db`
		SELECT
			id,
			title,
			body,
			date
		FROM posts
		WHERE
			title ilike ${`%${title}%`}
		`;

		return Value.Parse(t.Array(PostSchema), rowList);
	}

	async getPostById(id: Post['id']): Promise<Post | null> {
		const rowList = await this.#db`
		SELECT
			id,
			title,
			body,
			date
		FROM posts
		WHERE id = ${id}
		`;

		return Value.Parse(PostSchema, rowList[0]);
	}

	async updatePost(post: Post): Promise<Post | null> {
		const data = Value.Parse(PostSchema, post);

		const rowList = await this.#db`
		UPDATE posts
		SET
			title = ${data.title},
			body = ${data.body},
			date = ${data.date.toISOString()}
		WHERE id = ${data.id}
		RETURNING
			id,
			title,
			body,
			date
		`;

		return Value.Parse(PostSchema, rowList[0]);
	}

	async deletePostById(id: Post['id']): Promise<Post | null> {
		const rowList = await this.#db`
		DELETE FROM posts
		WHERE id = ${id}
		RETURNING
			id,
			title,
			body,
			date
		`;

		return Value.Parse(PostSchema, rowList[0]);
	}
}

export const PostRepositoryProvider = new Elysia({ name: 'post.repository' })
	.use(DatabaseProvider)
	.decorate(({ database }) => ({
		PostRepository: new PostRepository(database),
	}));
