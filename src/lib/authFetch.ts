import { getAuthHeader, isNativePlatform } from './tokenStorage';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

/**
 * Authenticated fetch wrapper
 * Uses CapacitorHttp for native platforms, fetch for web
 * Automatically adds Authorization header for native platforms
 * and credentials for web platforms
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
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

      console.log('[authFetch] Response body text (first 100 chars):', bodyText.substring(0, 100));

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
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}
