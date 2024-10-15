import Elysia from 'elysia';
import { database } from './database';

export const DatabaseProvider = new Elysia({ name: 'database' })
	.decorate({
		database,
	})
	.onStop(async ({ decorator: { database } }) => {
		await database.end();
	});
