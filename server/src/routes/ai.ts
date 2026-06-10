import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getHistoricalData, getFundamentals } from '../services/yahoo-finance.js';
import { performFullAnalysis } from '../services/technical-analysis.js';
import { analyzeStock, askChatAssistant, getMarketSentiment } from '../services/gemini-ai.js';
import { getCompanyNews, getMarketNews } from '../services/finnhub.js';
import { query } from '../services/db.js';
import rateLimit from 'express-rate-limit';
import { getPortfolioHoldings } from '../services/portfolio.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

router.use(requireAuth);

router.post('/analyze', aiLimiter, async (req, res) => {
  const { symbol, language, forceRefresh, strategy = 'Day Trade' } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    const userId = (req as any).user.id;
    const portfolio = await getPortfolioHoldings(userId);
    const holdings = portfolio.holdings || [];
    const userHolding = holdings.find((h: any) => h.symbol === symbol) || null;

    // 1. Check database for cached analysis if not forced to refresh
    if (!forceRefresh) {
      if (userHolding) {
        // Retrieve holding-specific Gemini analysis from portfolio table
        const portRes = await query(
          `SELECT gemini_analysis FROM portfolio WHERE user_id = $1 AND symbol = $2`,
          [userId, symbol]
        );
        if (portRes.rowCount && portRes.rows[0].gemini_analysis) {
          try {
            const portAnalysis = JSON.parse(portRes.rows[0].gemini_analysis);
            // Fetch global cached technical analysis
            const dbRes = await query(
              `SELECT gemini_analysis AS "geminiAnalysis", date FROM stock_data 
               WHERE symbol = $1 AND is_active = true`,
              [symbol]
            );
            if (dbRes.rowCount && dbRes.rows[0].geminiAnalysis) {
              const cachedMap = JSON.parse(dbRes.rows[0].geminiAnalysis);
              if (cachedMap && cachedMap[strategy]) {
                const mergedResult = {
                  ...cachedMap[strategy],
                  portfolioAnalysis: portAnalysis
                };
                console.log(`[AI Route] Returning merged cached Gemini analysis with user portfolio analysis for ${symbol} (${strategy}).`);
                return res.status(200).json(mergedResult);
              }
            }
          } catch (err) {
            console.warn(`[AI Route] Failed to parse cached user portfolio analysis for ${symbol}:`, err);
          }
        }
      } else {
        // Global cache check
        const dbRes = await query(
          `SELECT gemini_analysis AS "geminiAnalysis", date FROM stock_data 
           WHERE symbol = $1 AND is_active = true`,
          [symbol]
        );
        if (dbRes.rowCount && dbRes.rowCount > 0 && dbRes.rows[0].geminiAnalysis) {
          try {
            const cachedMap = JSON.parse(dbRes.rows[0].geminiAnalysis);
            if (cachedMap && typeof cachedMap === 'object' && cachedMap[strategy]) {
              console.log(`[AI Route] Returning cached Gemini analysis for ${symbol} (${strategy}) from date ${dbRes.rows[0].date}.`);
              return res.status(200).json(cachedMap[strategy]);
            }
          } catch (err) {
            console.warn(`[AI Route] Failed to parse cached gemini_analysis for ${symbol}:`, err);
          }
        }
      }
    }

    const history = await getHistoricalData(symbol, '1y');
    if (history.length < 50) {
      return res.status(400).json({ error: 'Insufficient historical data (minimum 50 bars required)' });
    }

    const highs = history.map((h) => h.high);
    const lows = history.map((h) => h.low);
    const closes = history.map((h) => h.close);
    const volume = history.map((h) => h.volume);
    const opens = history.map((h) => h.open);

    const fundamentals = await getFundamentals(symbol);
    const technicals = performFullAnalysis(highs, lows, closes, volume, true, fundamentals, opens);
    
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
      ema200: technicals.ema200,
      scalpScore: technicals.scalpScore,
      dayScore: technicals.dayScore,
      swingScore: technicals.swingScore,
      positionScore: technicals.positionScore,
      vwap: technicals.vwap,
      fundamentals
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

    const aiResult = await analyzeStock(symbol, history, indicators, language, newsContext, strategy, userHolding);

    // 2. Cache the new analysis result in PostgreSQL (using dynamic strategy map)
    try {
      const dbRes = await query(
        `SELECT gemini_analysis AS "geminiAnalysis" FROM stock_data 
         WHERE symbol = $1 AND is_active = true`,
        [symbol]
      );
      let cachedMap: any = {};
      if (dbRes.rowCount && dbRes.rows[0].geminiAnalysis) {
        try {
          cachedMap = JSON.parse(dbRes.rows[0].geminiAnalysis);
          if (typeof cachedMap !== 'object' || cachedMap === null || Array.isArray(cachedMap)) {
            cachedMap = {};
          }
        } catch {
          cachedMap = {};
        }
      }
      cachedMap[strategy] = aiResult;

      await query(
        `UPDATE stock_data 
         SET gemini_analysis = $1 
         WHERE symbol = $2 AND is_active = true`,
        [JSON.stringify(cachedMap), symbol]
      );
      console.log(`[AI Route] Cached Gemini analysis successfully for ${symbol} (${strategy}) in stock_data.`);
    } catch (dbErr) {
      console.error(`[AI Route] Failed to cache Gemini analysis for ${symbol}:`, dbErr);
    }

    // 3. Cache the user-specific portfolio Hold/Sell recommendations in portfolio database
    if (userHolding && aiResult.portfolioAnalysis) {
      try {
        await query(
          `INSERT INTO portfolio (user_id, symbol, shares, avg_price, gemini_analysis, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id, symbol) 
           DO UPDATE SET gemini_analysis = EXCLUDED.gemini_analysis, updated_at = NOW()`,
          [userId, symbol, userHolding.shares, userHolding.avgPrice, JSON.stringify(aiResult.portfolioAnalysis)]
        );
        console.log(`[AI Route] Saved user holding Gemini analysis for ${symbol} in portfolio database.`);
      } catch (dbErr) {
        console.error(`[AI Route] Failed to save user holding Gemini analysis for ${symbol}:`, dbErr);
      }
    }

    return res.status(200).json(aiResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error executing AI analysis' });
  }
});

router.get('/market-sentiment', aiLimiter, async (req, res) => {
  const language = (req.query.language as string) || 'id';
  try {
    const mktNews = await getMarketNews();
    const sentiment = await getMarketSentiment(mktNews, language);
    return res.status(200).json(sentiment);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error executing Market Sentiment analysis' });
  }
});

router.post('/chat', aiLimiter, async (req, res) => {
  const { message, history, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const responseText = await askChatAssistant(message, history || [], language || 'id');
    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error processing assistant chat message' });
  }
});

export default router;
