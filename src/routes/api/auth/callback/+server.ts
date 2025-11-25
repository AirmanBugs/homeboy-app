import { redirect, isRedirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuth2Client, getTokenFromCode } from '$lib/server/google-auth';
import { storeTokens } from '$lib/server/token-store';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		throw redirect(302, '/?error=no_code');
	}

	try {
		const oauth2Client = createOAuth2Client();
		const tokens = await getTokenFromCode(oauth2Client, code);

		// Store tokens in an encrypted cookie
		cookies.set('google_tokens', JSON.stringify(tokens), {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Also store in server memory for immediate use
		storeTokens(tokens);

		throw redirect(302, '/?auth=success');
	} catch (error) {
		// Don't log redirects as errors (they're part of normal flow)
		if (isRedirect(error)) {
			throw error;
		}
		console.error('OAuth callback error:', error);
		throw redirect(302, '/?error=auth_failed');
	}
};
