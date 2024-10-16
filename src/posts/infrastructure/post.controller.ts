import Elysia, { t } from 'elysia';
import { PostSchema, type Post } from '../domain/post.type';
import { PostRepositoryProvider } from './post.repository';

export const PostController = new Elysia({
	detail: {
		tags: ['post'],
	},
})
	.use(PostRepositoryProvider)
	.get(
		'/posts',
		async function handleGetPosts({ PostRepository }) {
			const posts = await PostRepository.listPosts();

			return {
				data: posts,
			};
		},
		{
			response: {
				200: t.Object({
					data: t.Array(PostSchema),
				}),
			},
			detail: {
				summary: 'List posts',
			},
		},
	)
	.post(
		'/posts',
		async function handleCreatePost({ PostRepository, body }) {
			const newPost: Post = {
				id: crypto.randomUUID(),
				...body,
			};

			const post = await PostRepository.createPost(newPost);

			return {
				data: post,
			};
		},
		{
			body: t.Omit(PostSchema, ['id']),
			response: {
				200: t.Object({
					data: PostSchema,
				}),
			},
			detail: {
				summary: 'Create post',
			},
		},
	)
	.get(
		'/posts/:postId',
		async function handleGetPostById({
			PostRepository,
			params: { postId },
			error,
		}) {
			const post = await PostRepository.getPostById(postId);

			if (!post) {
				return error('Not Found', {
					message: 'Post not found',
				});
			}

			return {
				data: post,
			};
		},
		{
			params: t.Object({
				postId: PostSchema.properties.id,
			}),
			response: {
				200: t.Object({
					data: PostSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Get post by id',
			},
		},
	)
	.patch(
		'/posts/:postId',
		async function handleUpdatePostByID({
			PostRepository,
			params: { postId },
			body,
			error,
		}) {
			const existingPost = await PostRepository.getPostById(postId);
			if (!existingPost) {
				return error('Not Found', {
					message: 'Post not found',
				});
			}

			const postToUpdate: Post = {
				...existingPost,
				...body,
			};

			const post = await PostRepository.updatePost(postToUpdate);

			if (!post) {
				return error('Not Found', {
					message: 'User not found',
				});
			}

			return {
				data: post,
			};
		},
		{
			params: t.Object({
				postId: PostSchema.properties.id,
			}),
			body: t.Partial(t.Omit(PostSchema, ['id'])),
			response: {
				200: t.Object({
					data: PostSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Update post',
			},
		},
	)
	.delete(
		'/posts/:postId',
		async function handleDeletePostById({
			PostRepository,
			params: { postId },
			error,
		}) {
			const post = await PostRepository.deletePostById(postId);

			if (!post) {
				return error('Not Found', {
					message: 'Post not found',
				});
			}

			return {
				data: post,
			};
		},
		{
			params: t.Object({
				postId: PostSchema.properties.id,
			}),
			response: {
				200: t.Object({
					data: PostSchema,
				}),
				404: t.Object({
					message: t.String(),
				}),
			},
			detail: {
				summary: 'Delete post',
			},
		},
	);
