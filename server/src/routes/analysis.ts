import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getHistoricalData, getFundamentals } from '../services/yahoo-finance.js';
import { performFullAnalysis as analyze } from '../services/technical-analysis.js';
import { query } from '../services/db.js';
import { checkAndTriggerIngestion, runHistoricalIngestion, runIngestionPipeline } from '../services/ingestion.js';

const router = Router();

router.use(requireAuth);

// POST /api/analysis/refresh - Force run the ingestion pipeline to refresh all metrics
router.post('/refresh', async (req, res) => {
  const { date, startDate, endDate } = req.body;
  try {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 7) {
        return res.status(400).json({ 
          error: 'Rentang tanggal perbarui data maksimal adalah 7 hari untuk mencegah rate limit.' 
        });
      }
      
      console.log(`[Analysis] Manual refresh requested for date range ${startDate} to ${endDate}. Running ingestion pipeline...`);
      await runIngestionPipeline(startDate, endDate);
    } else {
      console.log(`[Analysis] Manual refresh requested${date ? ` for date ${date}` : ''}. Running ingestion pipeline...`);
      await runIngestionPipeline(date);
    }
    return res.status(200).json({ message: 'Analysis refresh completed successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error refreshing metrics' });
  }
});

// GET /api/analysis/active-stocks - Get list of active registered stock symbols
router.get('/active-stocks', async (req, res) => {
  try {
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'us_market_enabled'");
    const usEnabled = settingsRes.rows[0]?.value === 'true';
    const queryStr = usEnabled 
      ? "SELECT symbol, name, market FROM stocks WHERE is_active = true ORDER BY symbol ASC"
      : "SELECT symbol, name, market FROM stocks WHERE is_active = true AND market = 'IDX' ORDER BY symbol ASC";
    
    const result = await query(queryStr);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching active stocks' });
  }
});

// GET /api/analysis/ingestion-logs - Fetch data fetch ingestion logs
router.get('/ingestion-logs', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, status, trigger_type AS "triggerType", symbol, start_date AS "startDate", end_date AS "endDate", records_count AS "recordsCount", details, created_at AS "createdAt"
       FROM ingestion_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching ingestion logs' });
  }
});

// POST /api/analysis/ingest-historical - Manual trigger for historical data fetching
router.post('/ingest-historical', async (req, res) => {
  const { symbol, symbols, all, startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate dan endDate diperlukan.' });
  }

  try {
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'us_market_enabled'");
    const usEnabled = settingsRes.rows[0]?.value === 'true';
    const marketFilter = usEnabled ? "" : " AND market = 'IDX'";

    let targetSymbols: string[] = [];

    if (all) {
      // Get all active symbols from database
      const activeStocks = await query(`SELECT symbol FROM stocks WHERE is_active = true${marketFilter}`);
      targetSymbols = activeStocks.rows.map(r => r.symbol);
    } else if (symbols && Array.isArray(symbols) && symbols.length > 0) {
      targetSymbols = symbols;
    } else if (symbol) {
      // Allow comma-separated symbols from input
      targetSymbols = symbol
        .split(',')
        .map((s: string) => s.trim().toUpperCase())
        .filter((s: string) => s.length > 0);
    } else {
      // Default to all active stocks if none specified
      const activeStocks = await query(`SELECT symbol FROM stocks WHERE is_active = true${marketFilter}`);
      targetSymbols = activeStocks.rows.map(r => r.symbol);
    }

    if (targetSymbols.length === 0) {
      return res.status(400).json({ error: 'Tidak ada simbol saham aktif yang ditemukan untuk diproses.' });
    }

    console.log(`[Historical Ingestion] Triggering historical data ingestion for ${targetSymbols.length} stocks from ${startDate} to ${endDate}...`);

    let totalCount = 0;
    const failures: string[] = [];

    // Run sequentially to avoid rate-limiting
    for (const sym of targetSymbols) {
      try {
        const result = await runHistoricalIngestion(sym, startDate, endDate);
        if (result.success) {
          totalCount += result.count;
        } else {
          failures.push(`${sym}: ${result.error}`);
        }
      } catch (err: any) {
        failures.push(`${sym}: ${err.message || err}`);
      }
    }

    return res.status(200).json({ 
      message: `Ingestion selesai untuk ${targetSymbols.length - failures.length} saham.`, 
      count: totalCount,
      failures: failures.length > 0 ? failures : undefined
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error triggering historical ingestion' });
  }
});

// GET /api/analysis - Retrieve all pre-calculated BTST stock calculations for the Screener
router.get('/', async (req, res) => {
  const targetDate = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  try {
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'us_market_enabled'");
    const usEnabled = settingsRes.rows[0]?.value === 'true';
    const marketFilter = usEnabled ? "" : " AND s.market = 'IDX'";

    const strategyParam = req.query.strategy as string;
    const defaultStrategyRes = await query("SELECT value FROM settings WHERE key = 'default_strategy'");
    const defaultStrategy = strategyParam || defaultStrategyRes.rows[0]?.value || 'Day Trade';

    let scoreColumn = 'swing_score';
    if (defaultStrategy === 'Scalp Trade') {
      scoreColumn = 'scalp_score';
    } else if (defaultStrategy === 'Day Trade') {
      scoreColumn = 'day_score';
    } else if (defaultStrategy === 'Position Trade') {
      scoreColumn = 'position_score';
    }

    // Only proactively trigger the lazy ingestion check if no specific date filter is applied (default latest flow)
    if (!targetDate && !startDate && !endDate) {
      checkAndTriggerIngestion().catch(err => {
        console.error('[Analysis] Background ingestion trigger failed:', err);
      });
    }

    let queryStr = `
      SELECT 
        d.symbol,
        d.${scoreColumn} AS score,
        d.rsi,
        d.macd_histogram AS "macdHistogram",
        d.ema9,
        d.ema21,
        d.ema50,
        d.price,
        d.change_percent AS change,
        d.date
      FROM stock_data d
      JOIN stocks s ON d.symbol = s.symbol
      WHERE d.is_active = true AND s.is_active = true${marketFilter}
      ORDER BY d.${scoreColumn} DESC
    `;
    let queryParams: any[] = [];

    if (startDate && endDate) {
      queryStr = `
        SELECT 
          d.symbol,
          d.${scoreColumn} AS score,
          d.rsi,
          d.macd_histogram AS "macdHistogram",
          d.ema9,
          d.ema21,
          d.ema50,
          d.price,
          d.change_percent AS change,
          d.date
        FROM stock_data d
        JOIN stocks s ON d.symbol = s.symbol
        WHERE DATE(d.date) >= $1 AND DATE(d.date) <= $2 AND s.is_active = true${marketFilter}
        ORDER BY d.date DESC, d.${scoreColumn} DESC
      `;
      queryParams = [startDate, endDate];
    } else if (targetDate) {
      queryStr = `
        SELECT 
          d.symbol,
          d.${scoreColumn} AS score,
          d.rsi,
          d.macd_histogram AS "macdHistogram",
          d.ema9,
          d.ema21,
          d.ema50,
          d.price,
          d.change_percent AS change,
          d.date
        FROM stock_data d
        JOIN stocks s ON d.symbol = s.symbol
        WHERE DATE(d.date) = $1 AND s.is_active = true${marketFilter}
        ORDER BY d.${scoreColumn} DESC
      `;
      queryParams = [targetDate];
    }

    // Query the stock calculations
    const result = await query(queryStr, queryParams);

    // Format fields correctly
    const formatted = result.rows.map(row => ({
      symbol: row.symbol,
      price: parseFloat(row.price) || 0,
      change: parseFloat(row.change) || 0,
      score: Math.round(parseFloat(row.score)) || 0,
      rsi: parseFloat(row.rsi) || 0,
      macdHistogram: parseFloat(row.macdHistogram) || 0,
      ema9: parseFloat(row.ema9) || 0,
      ema21: parseFloat(row.ema21) || 0,
      ema50: parseFloat(row.ema50) || 0,
      date: row.date
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching screener calculations' });
  }
});

// POST /api/analysis - Fallback/Real-time calculations for a specific stock (used by StockDetailPage.tsx)
router.post('/', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    // Fetch historical data (minimum 50 bars required for accurate calculations, 1y for EMA 200)
    const history = await getHistoricalData(symbol, '1y');
    if (history.length < 50) {
      return res.status(400).json({
        error: 'Insufficient historical data (minimum 50 bars required for analysis)'
      });
    }

    const highs = history.map((h) => h.high);
    const lows = history.map((h) => h.low);
    const closes = history.map((h) => h.close);
    const volume = history.map((h) => h.volume);
    const opens = history.map((h) => h.open);

    const fundamentals = await getFundamentals(symbol);

    const result = analyze(highs, lows, closes, volume, true, fundamentals, opens);
    return res.status(200).json({
      symbol,
      ...result,
      lastClose: closes[closes.length - 1],
      fundamentals
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error running technical analysis' });
  }
});

export default router;

