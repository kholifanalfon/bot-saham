import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../types/index.js';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_jwt_development';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export function generateToken(user: Partial<User> & { isPwa?: boolean }): string {
  const expiresIn = user.isPwa ? '30d' : (process.env.JWT_EXPIRY || '15m');
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, isPwa: user.isPwa },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

export function generateRefreshToken(user: Partial<User>): string {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY as any }
  );
}


