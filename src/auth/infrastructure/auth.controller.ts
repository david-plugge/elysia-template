import { setup } from '@/shared/infrastructure/setup';
import Elysia, { t } from 'elysia';
import { AuthServiceProvider } from './auth.service';
import { SessionServiceProvider } from '@/shared/infrastructure/session';
import { readAndRemoveCookie } from '@/lib/utils';

export const AuthController = new Elysia({
	prefix: '/auth',
	cookie: {
		httpOnly: true,
		sameSite: 'strict',
		path: '/api/v1/auth/oauth/callback',
	},
	detail: {
		tags: ['auth'],
	},
})
	.use(setup)
	.use(AuthServiceProvider)
	.get(
		'/oauth/signin',
		async function handleGetOAuthSignin({
			AuthService,
			query: { redirectUri },
			cookie: { auth_state, auth_code_verifier, success_redirect_uri },
			headers,
			redirect,
		}) {
			const { codeVerifier, state, url } =
				await AuthService.getAuthorizationData();

			auth_state.set({
				value: state,
			});
			auth_code_verifier.set({
				value: codeVerifier,
			});
			success_redirect_uri.set({
				value: redirectUri,
			});

			if (headers.accept?.startsWith('application/json')) {
				return {
					url: url.toString(),
				};
			}

			return redirect(url.toString(), 303);
		},
		{
			query: t.Object({
				redirectUri: t.String(),
			}),
			response: {
				200: t.Object({
					url: t.String(),
				}),
				400: 'error',
			},
			detail: {
				summary: 'Signin with OAuth',
				description: 'Initiate an OAuth code flow process',
			},
		},
	)

	.use(SessionServiceProvider)
	.get(
		'/oauth/callback',
		async function handleGetOAuthCallback({
			log,
			Session,
			AuthService,
			headers,
			query: { code, state },
			cookie: { auth_state, auth_code_verifier, success_redirect_uri },
			error,
			redirect,
		}) {
			try {
				const storedState = readAndRemoveCookie(auth_state);
				const codeVerifier = readAndRemoveCookie(auth_code_verifier);
				const redirectUri = readAndRemoveCookie(success_redirect_uri);

				if (state !== storedState) {
					throw new Error('State mismatch');
				}

				const { access_token } = await AuthService.verifyAuthorizationCode(
					code,
					codeVerifier,
				);

				const authUser = await AuthService.getUser(access_token);

				Session.set({
					userId: authUser.id,
				});

				if (headers.accept?.startsWith('application/json')) {
					return {
						url: redirectUri.toString(),
					};
				}

				return redirect(redirectUri, 303);
			} catch (e) {
				log.error(e);
				return error('Bad Request', {
					status: 'error',
					message: e instanceof Error ? e.message : 'Callback failed',
				});
			}
		},
		{
			query: t.Object({
				code: t.String(),
				state: t.String(),
			}),
			cookie: t.Cookie({
				auth_state: t.String(),
				auth_code_verifier: t.String(),
				success_redirect_uri: t.String(),
			}),
			response: {
				200: t.Object({
					url: t.String(),
				}),
				303: t.Never(),
				400: 'error',
			},
			detail: {
				summary: 'OAuth callback',
				description: 'Finalize the OAuth code flow process',
			},
		},
	)
	.post(
		'/logout',
		async ({ Session }) => {
			await Session.delete();

			return {
				success: true,
			};
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
				}),
			},
			detail: {
				summary: 'Logout',
				description: 'Logout and delete current session',
			},
		},
	);
