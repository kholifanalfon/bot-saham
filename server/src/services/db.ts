import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] Warning: DATABASE_URL environment variable is not configured.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper for running single queries easily
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('[Database] executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Helper to retrieve settings dynamically from settings table
export async function getSetting(key: string): Promise<string> {
  try {
    const res = await query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.rows[0]?.value || '';
  } catch (err) {
    console.error(`[Database] Error fetching setting ${key}:`, err);
    return '';
  }
}
