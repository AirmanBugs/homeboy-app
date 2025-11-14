import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const tokens = cookies.get('google_tokens');

	return json({
		authenticated: !!tokens
	});
};
