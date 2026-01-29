import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'mimy_access_token';
const REFRESH_TOKEN_KEY = 'mimy_refresh_token';

/**
 * Check if running on native platform (iOS/Android)
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Save JWT tokens (only for native platforms)
 * Returns true if save was successful and verified
 */
export const saveTokens = async (accessToken: string, refreshToken: string): Promise<boolean> => {
  if (!isNativePlatform()) {
    // On web, tokens are stored in HttpOnly cookies by the server
    console.log('[TokenStorage] Web platform, skipping token save');
    return true;
  }

  console.log('[TokenStorage] Native platform, saving tokens...');
  console.log('[TokenStorage] Access token length:', accessToken?.length);
  console.log('[TokenStorage] Refresh token length:', refreshToken?.length);

  try {
    await Preferences.set({ key: TOKEN_KEY, value: accessToken });
    console.log('[TokenStorage] Access token saved');

    await Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
    console.log('[TokenStorage] Refresh token saved');

    // Verify tokens were saved correctly
    const savedAccessToken = await getAccessToken();
    const savedRefreshToken = await getRefreshToken();

    console.log('[TokenStorage] Retrieved access token length:', savedAccessToken?.length);
    console.log('[TokenStorage] Retrieved refresh token length:', savedRefreshToken?.length);

    if (savedAccessToken === accessToken && savedRefreshToken === refreshToken) {
      console.log('[TokenStorage] ✅ Token save verified successfully');
      return true;
    } else {
      console.error('[TokenStorage] ❌ Token verification failed');
      console.error('[TokenStorage] Access token match:', savedAccessToken === accessToken);
      console.error('[TokenStorage] Refresh token match:', savedRefreshToken === refreshToken);
      return false;
    }
  } catch (error) {
    console.error('[TokenStorage] ❌ Failed to save tokens:', error);
    return false;
  }
};

/**
 * Get access token (only for native platforms)
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (!isNativePlatform()) {
    // On web, token is in HttpOnly cookie
    return null;
  }

  try {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  } catch (error) {
    console.error('[TokenStorage] Failed to get access token:', error);
    return null;
  }
};

/**
 * Get refresh token (only for native platforms)
 */
export const getRefreshToken = async (): Promise<string | null> => {
  if (!isNativePlatform()) {
    // On web, token is in HttpOnly cookie
    return null;
  }

  try {
    const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    return value;
  } catch (error) {
    console.error('[TokenStorage] Failed to get refresh token:', error);
    return null;
  }
};

/**
 * Clear all tokens
 * Returns true if tokens were successfully cleared and verified
 */
export const clearTokens = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    // On web, cookies are cleared by server /logout endpoint
    console.log('[TokenStorage] Web platform, cookies cleared by server');
    return true;
  }

  console.log('[TokenStorage] Native platform, clearing tokens...');

  try {
    // Check current state
    const beforeAccess = await getAccessToken();
    const beforeRefresh = await getRefreshToken();
    console.log('[TokenStorage] Before clear - Access token exists:', !!beforeAccess);
    console.log('[TokenStorage] Before clear - Refresh token exists:', !!beforeRefresh);

    // Remove tokens
    await Preferences.remove({ key: TOKEN_KEY });
    console.log('[TokenStorage] Access token removal attempted');

    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    console.log('[TokenStorage] Refresh token removal attempted');

    // Verify tokens were actually deleted
    const checkAccess = await getAccessToken();
    const checkRefresh = await getRefreshToken();

    console.log('[TokenStorage] After clear - Access token exists:', !!checkAccess);
    console.log('[TokenStorage] After clear - Refresh token exists:', !!checkRefresh);

    if (checkAccess === null && checkRefresh === null) {
      console.log('[TokenStorage] ✅ Token deletion verified successfully');
      return true;
    } else {
      console.error('[TokenStorage] ❌ Token deletion verification failed');
      console.error('[TokenStorage] Access token still exists:', !!checkAccess);
      console.error('[TokenStorage] Refresh token still exists:', !!checkRefresh);
      return false;
    }
  } catch (error) {
    console.error('[TokenStorage] ❌ Failed to clear tokens:', error);
    return false;
  }
};

/**
 * Get Authorization header for API requests
 */
export const getAuthHeader = async (): Promise<{ Authorization?: string }> => {
  if (!isNativePlatform()) {
    // On web, credentials are sent via cookies
    return {};
  }

  console.log('[getAuthHeader] Attempting to retrieve token...');
  const token = await getAccessToken();

  if (token) {
    console.log('[getAuthHeader] ✅ Token found, length:', token.length);
    console.log('[getAuthHeader] Token preview:', token.substring(0, 20) + '...');
    return { Authorization: `Bearer ${token}` };
  }

  console.error('[getAuthHeader] ❌ No token found in storage!');
  return {};
};
