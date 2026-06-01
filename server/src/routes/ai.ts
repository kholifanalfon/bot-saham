import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getHistoricalData } from '../services/yahoo-finance.js';
import { performFullAnalysis } from '../services/technical-analysis.js';
import { analyzeStock } from '../services/gemini-ai.js';
import { getCompanyNews, getMarketNews } from '../services/finnhub.js';
import { query } from '../services/db.js';

const router = Router();

router.use(requireAuth);

router.post('/analyze', async (req, res) => {
  const { symbol, language, forceRefresh } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    // 1. Check database for cached analysis if not forced to refresh
    if (!forceRefresh) {
      const dbRes = await query(
        `SELECT gemini_analysis AS "geminiAnalysis", date FROM stock_data 
         WHERE symbol = $1 AND is_active = true`,
        [symbol]
      );
      if (dbRes.rowCount && dbRes.rowCount > 0 && dbRes.rows[0].geminiAnalysis) {
        try {
          const cachedAnalysis = JSON.parse(dbRes.rows[0].geminiAnalysis);
          console.log(`[AI Route] Returning cached Gemini analysis for ${symbol} from date ${dbRes.rows[0].date}.`);
          return res.status(200).json(cachedAnalysis);
        } catch (err) {
          console.warn(`[AI Route] Failed to parse cached gemini_analysis for ${symbol}:`, err);
        }
      }
    }

    const history = await getHistoricalData(symbol, '3mo');
    if (history.length < 50) {
      return res.status(400).json({ error: 'Insufficient historical data (minimum 50 bars required)' });
    }

    const prices = history.map((h) => h.close);
    const volume = history.map((h) => h.volume);

    const technicals = performFullAnalysis(prices, volume);
    const indicators = {
      rsi: technicals.rsi,
      macd: {
        macd: (technicals.macd as any).macd || 0,
        signal: (technicals.macd as any).signal || 0,
        histogram: (technicals.macd as any).histogram || 0
      },
      ema9: technicals.ema9,
      ema21: technicals.ema21,
      ema50: technicals.ema50,
      btstScore: technicals.btstScore
    };

    // Fetch context for Gemini
    let newsContext = "";
    try {
      const compNews = await getCompanyNews(symbol);
      const mktNews = await getMarketNews();
      const combinedNews = [...compNews.slice(0, 3), ...mktNews.slice(0, 3)];
      if (combinedNews.length > 0) {
        newsContext = combinedNews.map((n: any) => `- ${n.headline || n.title}: ${n.summary}`).join('\n');
      }
    } catch (e) {
      console.log('Error fetching news for AI context:', e);
    }

    const aiResult = await analyzeStock(symbol, history, indicators, language, newsContext);

    // 2. Cache the new analysis result in PostgreSQL
    try {
      await query(
        `UPDATE stock_data 
         SET gemini_analysis = $1 
         WHERE symbol = $2 AND is_active = true`,
        [JSON.stringify(aiResult), symbol]
      );
      console.log(`[AI Route] Cached Gemini analysis successfully for ${symbol} in stock_data.`);
    } catch (dbErr) {
      console.error(`[AI Route] Failed to cache Gemini analysis for ${symbol}:`, dbErr);
    }

    return res.status(200).json(aiResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error executing AI analysis' });
  }
});

export default router;
