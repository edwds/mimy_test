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
    return true;
  }

  try {
    await Preferences.set({ key: TOKEN_KEY, value: accessToken });
    await Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
    console.log('[TokenStorage] Tokens saved to Preferences');

    // Verify tokens were saved correctly
    const savedAccessToken = await getAccessToken();
    const savedRefreshToken = await getRefreshToken();

    if (savedAccessToken === accessToken && savedRefreshToken === refreshToken) {
      console.log('[TokenStorage] Token save verified successfully');
      return true;
    } else {
      console.error('[TokenStorage] Token verification failed');
      return false;
    }
  } catch (error) {
    console.error('[TokenStorage] Failed to save tokens:', error);
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
 */
export const clearTokens = async () => {
  if (!isNativePlatform()) {
    // On web, cookies are cleared by server /logout endpoint
    return;
  }

  try {
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    console.log('[TokenStorage] Tokens cleared');
  } catch (error) {
    console.error('[TokenStorage] Failed to clear tokens:', error);
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

  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
};
