import Elysia, { t } from 'elysia';
import { UserSchema, type User } from '../domain/user.type';
import { UserRepositoryProvider } from './user.repository';

export const UserController = new Elysia({
	detail: {
		tags: ['user'],
	},
})
	.use(UserRepositoryProvider)
	.get(
		'/users',
		async function handleGetUsers({ UserRepository }) {
			const users = await UserRepository.listUsers();

			return {
				data: users,
			};
		},
		{
			response: {
				200: t.Object({
					data: t.Array(UserSchema),
				}),
			},
			detail: {
				summary: 'List users',
			},
		},
	)
	.post(
		'/users',
		async function handleCreateUser({ UserRepository, body }) {
			const newUser: User = {
				id: crypto.randomUUID(),
				...body,
			};

			const user = await UserRepository.createUser(newUser);

			return {
				data: user,
			};
		},
		{
			body: t.Omit(UserSchema, ['id']),
			response: {
				200: t.Object({
					data: UserSchema,
				}),
			},
			detail: {
				summary: 'Create user',
			},
		},
	)
	.get(
		'/users/:userId',
		async function handleGetUserById({
			UserRepository,
			params: { userId },
			error,
		}) {
			const user = await UserRepository.getUserById(userId);

			if (!user) {
				return error('Not Found', {
					message: 'User not found',
				});
			}

			return {
				data: user,
			};
		},
		{
			params: t.Object({
				userId: UserSchema.properties.id,
			}),
			response: {
				200: t.Object({
					data: UserSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Get user by id',
			},
		},
	)
	.patch(
		'/users/:userId',
		async function handleUpdateUserById({
			UserRepository,
			params: { userId },
			body,
			error,
		}) {
			const existingUser = await UserRepository.getUserById(userId);
			if (!existingUser) {
				return error('Not Found', {
					message: 'User not found',
				});
			}

			const userToUpdate: User = {
				...existingUser,
				...body,
			};

			const user = await UserRepository.updateUser(userToUpdate);

			if (!user) {
				return error('Not Found', {
					message: 'User not found',
				});
			}

			return {
				data: user,
			};
		},
		{
			params: t.Object({
				userId: UserSchema.properties.id,
			}),
			body: t.Partial(t.Omit(UserSchema, ['id'])),
			response: {
				200: t.Object({
					data: UserSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Update user',
			},
		},
	)
	.delete(
		'/users/:userId',
		async function handleDeleteUserById({
			UserRepository,
			params: { userId },
			error,
		}) {
			const user = await UserRepository.deleteUserById(userId);

			if (!user) {
				return error('Not Found', {
					message: 'User not found',
				});
			}

			return {
				data: user,
			};
		},
		{
			params: t.Object({
				userId: UserSchema.properties.id,
			}),
			response: {
				200: t.Object({
					data: UserSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Delete user',
			},
		},
	);
