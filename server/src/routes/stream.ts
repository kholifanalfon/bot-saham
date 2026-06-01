import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { getYahooQuote } from '../services/yahoo-finance.js';
import { checkAlerts } from '../services/alert-engine.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_development';

router.get('/prices', (req: AuthRequest, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Stream token is missing' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Stream token is invalid or expired' });
  }

  // Setup SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Keep connection alive with simple heartbeat pulse
  const keepAliveInterval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  // Monitor prices of prominent watchlisted stocks and broadcast
  const watchedSymbols = ['BBRI.JK', 'BBCA.JK', 'BMRI.JK', 'AAPL', 'TSLA', 'GOTO.JK'];
  
  const priceBroadcaster = setInterval(async () => {
    const symbol = watchedSymbols[Math.floor(Math.random() * watchedSymbols.length)];
    try {
      const quote = await getYahooQuote(symbol);
      
      // Also evaluate alerts with the latest prices
      const triggeredAlerts = await checkAlerts({ [symbol]: quote });
      if (triggeredAlerts.length > 0) {
        res.write(`event: alert\ndata: ${JSON.stringify(triggeredAlerts)}\n\n`);
      }

      res.write(`event: price\ndata: ${JSON.stringify({ symbol, quote })}\n\n`);
    } catch (error) {
      // Fail silently to keep the stream running
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    clearInterval(priceBroadcaster);
    res.end();
  });
});

export default router;
