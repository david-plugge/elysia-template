import Elysia from 'elysia';
import { UserController } from './users/infrastructure/user.controller';
import { PostController } from './posts/infrastructure/post.controller';

export const router = new Elysia({
	prefix: '/api/v1',
})
	.use(UserController)
	.use(PostController);
