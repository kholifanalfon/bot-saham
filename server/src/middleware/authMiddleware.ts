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
    };
    req.user = decoded;

    // Refresh sliding session token and cookie on interaction
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    });

    res.cookie(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 mins
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
    };
    req.user = decoded;

    // Refresh sliding session token and cookie on interaction
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    });

    res.cookie(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
}
