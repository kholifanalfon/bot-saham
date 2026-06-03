import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { query } from '../services/db.js';
import { runIngestionPipeline } from '../services/ingestion.js';
import { spawn } from 'child_process';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings: Record<string, any> = {};
    
    result.rows.forEach(row => {
      settings[row.key] = row.value === 'true' ? true : row.value === 'false' ? false : row.value;
    });

    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error retrieving settings' });
  }
});

router.post('/', async (req, res) => {
  const { 
    us_market_enabled, 
    finnhub_api_key, 
    sectors_api_key, 
    gemini_api_key, 
    gemini_model,
    swing_tp_percent,
    swing_sl_percent,
    swing_tsl_enabled,
    swing_tsl_trigger_percent,
    swing_tsl_trail_percent,
    gemini_idx_indices
  } = req.body;

  try {
    if (us_market_enabled !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('us_market_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [us_market_enabled ? 'true' : 'false']
      );

      // If enabled, trigger ingestion in the background to populate US stock analysis immediately
      if (us_market_enabled) {
        console.log('[Settings] US stocks enabled, triggering immediate background ingestion...');
        runIngestionPipeline().catch(err => {
          console.error('[Settings] Background ingestion pipeline failed:', err);
        });
      }
    }

    // Save API keys dynamically if they are modified and not masked dots
    if (finnhub_api_key !== undefined && finnhub_api_key.trim() !== '' && !finnhub_api_key.includes('●')) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('finnhub_api_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [finnhub_api_key]
      );
    }

    if (sectors_api_key !== undefined && sectors_api_key.trim() !== '' && !sectors_api_key.includes('●')) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('sectors_api_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [sectors_api_key]
      );
    }

    if (gemini_api_key !== undefined && gemini_api_key.trim() !== '' && !gemini_api_key.includes('●')) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('gemini_api_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [gemini_api_key]
      );
    }

    if (gemini_model !== undefined && gemini_model.trim() !== '') {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('gemini_model', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [gemini_model.trim()]
      );
    }

    // Save Swing & TSL dynamic parameters
    if (swing_tp_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('swing_tp_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(swing_tp_percent)]
      );
    }

    if (swing_sl_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('swing_sl_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(swing_sl_percent)]
      );
    }

    if (swing_tsl_enabled !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('swing_tsl_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [swing_tsl_enabled ? 'true' : 'false']
      );
    }

    if (swing_tsl_trigger_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('swing_tsl_trigger_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(swing_tsl_trigger_percent)]
      );
    }

    if (swing_tsl_trail_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('swing_tsl_trail_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(swing_tsl_trail_percent)]
      );
    }

    if (gemini_idx_indices !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('gemini_idx_indices', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(gemini_idx_indices)]
      );
    }

    return res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating settings' });
  }
});

import { fileURLToPath } from 'url';
import path from 'path';

router.get('/sync-stocks/stream', async (req, res) => {
  try {
    console.log('[Settings] Spawning stock registry sync process with streaming...');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverDir = path.resolve(__dirname, '../../');

    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const child = spawn('npm', ['run', 'db:sync-stocks'], {
      cwd: serverDir
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      res.write(`data: ${JSON.stringify({ type: 'stdout', message: text })}\n\n`);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      res.write(`data: ${JSON.stringify({ type: 'stderr', message: text })}\n\n`);
    });

    child.on('close', (code) => {
      res.write(`data: ${JSON.stringify({ type: 'exit', code: code ?? 0 })}\n\n`);
      res.end();
    });

    child.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => {
      console.log('[Settings] Client disconnected from sync-stocks stream. Terminating child process...');
      child.kill();
    });

  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Error executing sync' })}\n\n`);
    res.end();
  }
});

router.post('/sync-stocks', async (req, res) => {
  try {
    console.log('[Settings] Spawning stock registry sync process...');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Navigate from server/src/routes to server/
    const serverDir = path.resolve(__dirname, '../../');

    // Trigger in the background so it doesn't block the HTTP request
    const child = spawn('npm', ['run', 'db:sync-stocks'], {
      cwd: serverDir,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return res.status(200).json({ message: 'Stock synchronization triggered successfully in background' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error triggering stock sync' });
  }
});

export default router;
