import { getAuthHeader, isNativePlatform } from './tokenStorage';

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header for native platforms
 * and credentials for web platforms
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  // For native platforms, add Authorization header
  if (isNativePlatform()) {
    const authHeader = await getAuthHeader();
    Object.assign(headers, authHeader);
  }

  // For web, include credentials (cookies)
  const credentials = isNativePlatform() ? undefined : 'include';

  return fetch(url, {
    ...options,
    headers,
    credentials: credentials as RequestCredentials
  });
}
