import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuth2Client, getAuthUrl } from '$lib/server/google-auth';

export const GET: RequestHandler = async () => {
	const oauth2Client = createOAuth2Client();
	const authUrl = getAuthUrl(oauth2Client);

	throw redirect(302, authUrl);
};
