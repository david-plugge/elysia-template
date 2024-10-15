import Elysia from 'elysia';
import { UserController } from './users/infrastructure/user.controller';
import { PostController } from './posts/infrastructure/post.controller';
import { AuthController } from './auth/infrastructure/auth.controller';

export const router = new Elysia({
	prefix: '/api/v1',
})
	.use(AuthController)
	.use(UserController)
	.use(PostController);
