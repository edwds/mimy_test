import { getAuthHeader, isNativePlatform } from './tokenStorage';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log('[authFetch] Attempting to refresh access token...');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('[authFetch] ✅ Token refreshed successfully');
        return true;
      } else {
        console.log('[authFetch] ❌ Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('[authFetch] Token refresh error:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Authenticated fetch wrapper
 * Uses CapacitorHttp for native platforms, fetch for web
 * Automatically adds Authorization header for native platforms
 * and credentials for web platforms
 * Automatically refreshes token on 401 errors
 */
export async function authFetch(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // For native platforms, use CapacitorHttp
  if (isNativePlatform()) {
    console.log('[authFetch] Using CapacitorHttp for native platform');
    console.log('[authFetch] URL:', url);
    console.log('[authFetch] Method:', options.method || 'GET');

    const authHeader = await getAuthHeader();
    console.log('[authFetch] Auth header:', authHeader);

    if (!authHeader.Authorization) {
      console.error('[authFetch] ⚠️ WARNING: No Authorization token found!');
      console.error('[authFetch] This request will likely fail with 401');
    }

    Object.assign(headers, authHeader);
    console.log('[authFetch] Final headers:', headers);

    try {
      const response: HttpResponse = await CapacitorHttp.request({
        url,
        method: options.method as any || 'GET',
        headers,
        data: options.body ? JSON.parse(options.body as string) : undefined,
      });

      console.log('[authFetch] Native response status:', response.status);
      console.log('[authFetch] Native response data type:', typeof response.data);
      console.log('[authFetch] Native response data:', response.data);

      // CapacitorHttp already parses JSON, so response.data is already an object
      // We need to convert it to a string for the Response constructor
      let bodyText: string;

      if (response.data === null || response.data === undefined) {
        bodyText = 'null';
      } else if (typeof response.data === 'string') {
        bodyText = response.data;
      } else if (typeof response.data === 'object') {
        bodyText = JSON.stringify(response.data);
      } else {
        bodyText = String(response.data);
      }

      console.log('[authFetch] Response body text (first 100 chars):', bodyText.slice(0, 100));

      // Convert CapacitorHttp response to fetch Response
      const fetchResponse = new Response(bodyText, {
        status: response.status,
        statusText: response.status === 200 ? 'OK' : 'Error',
        headers: new Headers(response.headers as Record<string, string>)
      });

      console.log('[authFetch] Fetch Response created successfully');
      return fetchResponse;
    } catch (error) {
      console.error('[authFetch] Native fetch error:', error);
      console.error('[authFetch] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // For web, use regular fetch with credentials
  console.log('[authFetch] Using web fetch');
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  // If 401 and not already retrying, attempt token refresh
  if (response.status === 401 && retryCount === 0 && !url.includes('/auth/refresh')) {
    console.log('[authFetch] Received 401, attempting token refresh...');
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      console.log('[authFetch] Token refreshed, retrying original request...');
      // Retry the original request
      return authFetch(url, options, retryCount + 1);
    } else {
      console.log('[authFetch] Token refresh failed, returning 401 response');
      // Redirect to login if refresh fails
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/start') && !window.location.pathname.includes('/login')) {
        console.log('[authFetch] Redirecting to /start due to auth failure');
        window.location.href = '/start';
      }
    }
  }

  return response;
}
