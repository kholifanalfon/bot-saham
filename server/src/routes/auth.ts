import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { generateToken, generateRefreshToken } from '../services/auth.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { query } from '../services/db.js';

const router = Router();
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'bot_saham_session';

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existsResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existsResult.rowCount && existsResult.rowCount > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await query(
      `INSERT INTO users (id, email, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email.toLowerCase(), name, 'user', passwordHash, true]
    );

    const safeUser = {
      id: userId,
      email: email.toLowerCase(),
      name,
      role: 'user' as const
    };

    const accessToken = generateToken(safeUser);

    // Set httpOnly session cookie
    res.cookie(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(201).json({ user: safeUser, token: accessToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!userResult.rowCount || userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any
    };

    const accessToken = generateToken(safeUser);

    res.cookie(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(200).json({ user: safeUser, token: accessToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  return res.status(200).json({ user: req.user });
});

export default router;
