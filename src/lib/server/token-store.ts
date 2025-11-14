import { browser } from '$app/environment';

// Simple in-memory token storage
// For production, you'd want to use a database or encrypted cookies
let tokens: any = null;

export function storeTokens(tokenData: any): void {
	if (browser) {
		localStorage.setItem('google_calendar_tokens', JSON.stringify(tokenData));
	} else {
		tokens = tokenData;
	}
}

export function getTokens(): any {
	if (browser) {
		const stored = localStorage.getItem('google_calendar_tokens');
		return stored ? JSON.parse(stored) : null;
	}
	return tokens;
}

export function clearTokens(): void {
	if (browser) {
		localStorage.removeItem('google_calendar_tokens');
	} else {
		tokens = null;
	}
}

export function hasTokens(): boolean {
	return getTokens() !== null;
}
