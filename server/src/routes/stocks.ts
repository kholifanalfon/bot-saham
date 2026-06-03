import { Router } from 'express';
import { getQuote } from '../services/finnhub.js';
import { getHistoricalData, getYahooQuote } from '../services/yahoo-finance.js';
import { getIDXStocks } from '../services/sectors.js';
import { query } from '../services/db.js';

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

  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    const historical = await getHistoricalData(symbol, period);
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

    const result = await query(
      `SELECT 
        s.symbol, 
        s.name, 
        s.market, 
        s.is_active AS "isActive",
        COALESCE(d.swing_score, 0) AS "swingScore"
       FROM stocks s
       LEFT JOIN stock_data d ON s.symbol = d.symbol AND d.is_active = true
       ${whereClause}
       ORDER BY "swingScore" DESC, s.symbol ASC`
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching stock registry' });
  }
});

export default router;
