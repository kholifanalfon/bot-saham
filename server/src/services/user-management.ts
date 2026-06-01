import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../types/index.js';
import { query } from './db.js';

export async function getAllUsers(
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: UserRole,
  status?: boolean
) {
  let queryText = 'SELECT id, email, name, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt" FROM users WHERE 1=1';
  const params: any[] = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    queryText += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
  }

  if (role) {
    params.push(role);
    queryText += ` AND role = $${params.length}`;
  }

  if (status !== undefined) {
    params.push(status);
    queryText += ` AND is_active = $${params.length}`;
  }

  // Get total count
  const countResult = await query(`SELECT COUNT(*) FROM (${queryText}) AS temp`, params);
  const total = parseInt(countResult.rows[0].count) || 0;

  // Add pagination
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  queryText += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await query(queryText, params);
  const users = result.rows;

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
  const result = await query(
    'SELECT id, email, name, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt" FROM users WHERE id = $1',
    [id]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  return result.rows[0];
}

export async function createUser(email: string, password: string, name: string, role: UserRole): Promise<User> {
  const check = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (check.rowCount && check.rowCount > 0) {
    throw new Error('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  await query(
    `INSERT INTO users (id, email, name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, email.toLowerCase(), name, role, passwordHash]
  );

  return {
    id: userId,
    email: email.toLowerCase(),
    name,
    role,
    passwordHash,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null
  };
}

export async function updateUser(id: string, data: { name?: string; email?: string; role?: UserRole }): Promise<Omit<User, 'passwordHash'>> {
  const checkUser = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!checkUser.rowCount || checkUser.rowCount === 0) {
    throw new Error('User not found');
  }

  if (data.email) {
    const emailLower = data.email.toLowerCase();
    const exists = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailLower, id]);
    if (exists.rowCount && exists.rowCount > 0) {
      throw new Error('Email is already taken');
    }
  }

  const fields: string[] = [];
  const params: any[] = [id];

  if (data.name !== undefined) {
    params.push(data.name);
    fields.push(`name = $${params.length}`);
  }
  if (data.email !== undefined) {
    params.push(data.email.toLowerCase());
    fields.push(`email = $${params.length}`);
  }
  if (data.role !== undefined) {
    params.push(data.role);
    fields.push(`role = $${params.length}`);
  }

  if (fields.length > 0) {
    await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1`,
      params
    );
  }

  const updated = await getUserById(id);
  if (!updated) throw new Error('User not found after update');
  return updated as any;
}

export async function toggleUserStatus(id: string): Promise<Omit<User, 'passwordHash'>> {
  const checkUser = await query('SELECT is_active FROM users WHERE id = $1', [id]);
  if (!checkUser.rowCount || checkUser.rowCount === 0) {
    throw new Error('User not found');
  }

  const newStatus = !checkUser.rows[0].is_active;
  await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);

  const updated = await getUserById(id);
  if (!updated) throw new Error('User not found after toggle');
  return updated as any;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const checkUser = await query('SELECT id FROM users WHERE id = $1', [id]);
  if (!checkUser.rowCount || checkUser.rowCount === 0) {
    throw new Error('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id]);
}

export async function deleteUser(id: string): Promise<void> {
  const result = await query('DELETE FROM users WHERE id = $1', [id]);
  if (!result.rowCount || result.rowCount === 0) {
    throw new Error('User not found');
  }
}

export async function getUserStats() {
  const totalRes = await query('SELECT COUNT(*) FROM users');
  const activeRes = await query('SELECT COUNT(*) FROM users WHERE is_active = true');
  const adminsRes = await query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
  const monthRes = await query("SELECT COUNT(*) FROM users WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)");

  return {
    total: parseInt(totalRes.rows[0].count) || 0,
    active: parseInt(activeRes.rows[0].count) || 0,
    admins: parseInt(adminsRes.rows[0].count) || 0,
    newThisMonth: parseInt(monthRes.rows[0].count) || 0
  };
}
