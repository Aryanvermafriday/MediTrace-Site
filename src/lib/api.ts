import { getSupabase } from './supabase';

/**
 * Calls a protected same-origin API route with the active Supabase access token.
 * The server validates this token before allowing access to paid AI services.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured for this deployment.');
  }

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
