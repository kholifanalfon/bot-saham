import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { generateToken } from '../services/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_development';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'bot_saham_session';

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Session token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
      isPwa?: boolean;
    };
    req.user = decoded;

    // Refresh sliding session token and cookie on interaction
    const isPwa = !!decoded.isPwa;
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      isPwa
    });

    let cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    if (cookieDomain && (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname.match(/^\d+\.\d+\.\d+\.\d+$/))) {
      cookieDomain = undefined;
    }
    const maxAge = isPwa ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;

    res.cookie(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge
    });

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Session token is invalid or expired' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
      isPwa?: boolean;
    };
    req.user = decoded;

    // Refresh sliding session token and cookie on interaction
    const isPwa = !!decoded.isPwa;
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      isPwa
    });

    let cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    if (cookieDomain && (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname.match(/^\d+\.\d+\.\d+\.\d+$/))) {
      cookieDomain = undefined;
    }
    const maxAge = isPwa ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;

    res.cookie(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge
    });

    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
}
