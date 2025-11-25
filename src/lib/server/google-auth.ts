import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI
} from '$env/static/private';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

export function createOAuth2Client(): OAuth2Client {
	return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(oauth2Client: OAuth2Client): string {
	return oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
		// Removed 'prompt: consent' to reuse existing refresh tokens
		// and avoid hitting Google's 50 token limit per user
	});
}

export async function getTokenFromCode(oauth2Client: OAuth2Client, code: string) {
	const { tokens } = await oauth2Client.getToken(code);
	oauth2Client.setCredentials(tokens);
	return tokens;
}

export function setCredentials(oauth2Client: OAuth2Client, tokens: any) {
	oauth2Client.setCredentials(tokens);
}
