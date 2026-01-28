import jwt from 'jsonwebtoken';

// JWT secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

// Token payload interfaces
export interface AccessTokenPayload {
  userId: number;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: number;
  type: 'refresh';
}

/**
 * Generate JWT access token (15 minute expiry)
 * @param userId - User ID
 * @param email - User email
 * @returns Signed JWT token
 */
export function generateAccessToken(userId: number, email: string): string {
  const payload: AccessTokenPayload = {
    userId,
    email,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'mimy-api',
    audience: 'mimy-client'
  });
}

/**
 * Generate JWT refresh token (7 day expiry)
 * @param userId - User ID
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = {
    userId,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'mimy-api',
    audience: 'mimy-client'
  });
}

/**
 * Verify and decode access token
 * @param token - JWT access token
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mimy-api',
      audience: 'mimy-client'
    }) as AccessTokenPayload;

    if (decoded.type !== 'access') {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token expired, invalid, or malformed
    return null;
  }
}

/**
 * Verify and decode refresh token
 * @param token - JWT refresh token
 * @returns Decoded payload or null if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mimy-api',
      audience: 'mimy-client'
    }) as RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token expired, invalid, or malformed
    return null;
  }
}
