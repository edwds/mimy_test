import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

/**
 * Middleware to require authentication
 * Verifies JWT token from cookies and populates req.user
 * Returns 401 if authentication fails
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Priority 1: Authorization header (for mobile apps)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          email: payload.email
        };
        return next();
      }
    }

    // Priority 2: JWT cookie (for web)
    const token = req.cookies?.access_token;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          email: payload.email
        };
        return next();
      }
    }

    // Priority 3: Temporary dual-mode support for x-user-id header
    // TODO: Remove this after 2 weeks (migration period)
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      const userId = parseInt(userIdHeader as string, 10);
      if (!isNaN(userId)) {
        console.warn(`[DEPRECATED] x-user-id header used by user ${userId}. Please migrate to JWT authentication.`);
        req.user = {
          id: userId,
          email: '' // Email not available in legacy mode
        };
        return next();
      }
    }

    // No valid authentication found
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware for optional authentication
 * Verifies JWT token if present, but continues even if not authenticated
 * Populates req.user if token is valid, otherwise req.user is undefined
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Priority 1: Authorization header (for mobile apps)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          email: payload.email
        };
        return next();
      }
    }

    // Priority 2: JWT cookie (for web)
    const token = req.cookies?.access_token;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          email: payload.email
        };
        return next();
      }
    }

    // Priority 3: Legacy x-user-id header (dual-mode support)
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      const userId = parseInt(userIdHeader as string, 10);
      if (!isNaN(userId)) {
        console.warn(`[DEPRECATED] x-user-id header used by user ${userId}. Please migrate to JWT authentication.`);
        req.user = {
          id: userId,
          email: ''
        };
        return next();
      }
    }

    // No authentication provided - continue without user
    req.user = undefined;
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication on error
    req.user = undefined;
    next();
  }
};
