import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearTokens } from '$lib/server/token-store';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('google_tokens', { path: '/' });
	clearTokens();

	return json({ success: true });
};
