import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { query } from '../services/db.js';
import { runIngestionPipeline } from '../services/ingestion.js';

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
    btst_tp_percent,
    btst_sl_percent,
    btst_tsl_enabled,
    btst_tsl_trigger_percent,
    btst_tsl_trail_percent
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

    // Save BTST & TSL dynamic parameters
    if (btst_tp_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('btst_tp_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(btst_tp_percent)]
      );
    }

    if (btst_sl_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('btst_sl_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(btst_sl_percent)]
      );
    }

    if (btst_tsl_enabled !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('btst_tsl_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [btst_tsl_enabled ? 'true' : 'false']
      );
    }

    if (btst_tsl_trigger_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('btst_tsl_trigger_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(btst_tsl_trigger_percent)]
      );
    }

    if (btst_tsl_trail_percent !== undefined) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('btst_tsl_trail_percent', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(btst_tsl_trail_percent)]
      );
    }

    return res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating settings' });
  }
});

export default router;
