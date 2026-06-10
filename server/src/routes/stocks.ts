import { Router } from 'express';
import { getQuote } from '../services/finnhub.js';
import { getHistoricalData, getYahooQuote } from '../services/yahoo-finance.js';
import { getIDXStocks } from '../services/sectors.js';
import { query } from '../services/db.js';
import { lookupStockInfo } from '../services/gemini-ai.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { ingestSingleStock } from '../services/ingestion.js';

const router = Router();

router.get('/quote', async (req, res) => {
  const symbol = req.query.symbol as string;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    let quote;
    if (symbol.endsWith('.JK')) {
      // Use Yahoo Finance as default for Indonesian Stocks
      quote = await getYahooQuote(symbol);
    } else {
      // Use Finnhub for US Stocks
      quote = await getQuote(symbol);
    }
    return res.status(200).json(quote);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching quote' });
  }
});

router.get('/candles', async (req, res) => {
  const symbol = req.query.symbol as string;
  const period = (req.query.period as string) || '1mo';
  const interval = req.query.interval as string;

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    const historical = await getHistoricalData(symbol, period, interval);
    return res.status(200).json(historical);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching historical data' });
  }
});

router.get('/idx-stocks', async (req, res) => {
  try {
    const stocks = await getIDXStocks();
    return res.status(200).json(stocks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching IDX stocks' });
  }
});

router.get('/registry', async (req, res) => {
  try {
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'us_market_enabled'");
    const usEnabled = settingsRes.rows[0]?.value === 'true';
    const whereClause = usEnabled ? "" : "WHERE s.market = 'IDX'";

    const defaultStrategyRes = await query("SELECT value FROM settings WHERE key = 'default_strategy'");
    const defaultStrategy = defaultStrategyRes.rows[0]?.value || 'Day Trade';

    let scoreColumn = 'swing_score';
    if (defaultStrategy === 'Scalp Trade') {
      scoreColumn = 'scalp_score';
    } else if (defaultStrategy === 'Day Trade') {
      scoreColumn = 'day_score';
    } else if (defaultStrategy === 'Position Trade') {
      scoreColumn = 'position_score';
    }

    const result = await query(
      `SELECT 
        s.symbol, 
        s.name, 
        s.market, 
        s.is_active AS "isActive",
        COALESCE(s.category, 'core') AS "category",
        COALESCE(d.swing_score, 0) AS "swingScore",
        COALESCE(d.scalp_score, 0) AS "scalpScore",
        COALESCE(d.day_score, 0) AS "dayScore",
        COALESCE(d.position_score, 0) AS "positionScore",
        COALESCE(d.${scoreColumn}, 0) AS "activeScore"
       FROM stocks s
       LEFT JOIN stock_data d ON s.symbol = d.symbol AND d.is_active = true
       ${whereClause}
       ORDER BY "category" DESC, "activeScore" DESC, s.symbol ASC`
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching stock registry' });
  }
});

// POST /api/stocks/lookup - Lookup company info for a stock code using Gemini AI
router.post('/lookup', requireAuth, async (req, res) => {
  const { symbol } = req.body;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    const info = await lookupStockInfo(symbol);
    return res.status(200).json(info);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error looking up stock info' });
  }
});

// POST /api/stocks/add - Add a new stock to the registry
router.post('/add', requireAuth, async (req, res) => {
  const { symbol, name, market } = req.body;
  if (!symbol || !name || !market) {
    return res.status(400).json({ error: 'symbol, name, and market are required' });
  }

  const upperSymbol = symbol.trim().toUpperCase();
  const cleanMarket = market.trim().toUpperCase();

  if (!['IDX', 'US'].includes(cleanMarket)) {
    return res.status(400).json({ error: 'market must be IDX or US' });
  }

  try {
    // Check if symbol already exists
    const existing = await query('SELECT symbol FROM stocks WHERE symbol = $1', [upperSymbol]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: `Stock ${upperSymbol} is already registered in the registry.` });
    }

    await query(
      `INSERT INTO stocks (symbol, name, market, is_active) VALUES ($1, $2, $3, true)
       ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, market = EXCLUDED.market, is_active = true`,
      [upperSymbol, name.trim(), cleanMarket]
    );

    console.log(`[Stock Registry] Added new stock: ${upperSymbol} (${name}) on ${cleanMarket}`);

    // Trigger data ingestion asynchronously in background — don't block the response
    ingestSingleStock(upperSymbol).catch((err) =>
      console.error(`[Stock Registry] Background ingestion failed for ${upperSymbol}:`, err)
    );

    return res.status(201).json({
      message: `Stock ${upperSymbol} successfully added to registry. Data ingestion started in background.`,
      symbol: upperSymbol,
      name: name.trim(),
      market: cleanMarket,
      ingesting: true
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error adding stock to registry' });
  }
});

export default router;
