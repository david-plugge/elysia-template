import type { StaticDecode } from '@sinclair/typebox';
import { t } from 'elysia';

export const PostSchema = t.Object({
	id: t.String({ format: 'uuid' }),
	title: t.String(),
	body: t.String(),
	date: t.Date(),
});

export type Post = StaticDecode<typeof PostSchema>;
