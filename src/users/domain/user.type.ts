import type { StaticDecode } from '@sinclair/typebox';
import { t } from 'elysia';

export const UserSchema = t.Object({
	id: t.String({ format: 'uuid' }),
	username: t.String(),
});

export type User = StaticDecode<typeof UserSchema>;
