import dotenv from 'dotenv';
// Load env vars at the very beginning of execution
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import stockRoutes from './routes/stocks.js';
import analysisRoutes from './routes/analysis.js';
import aiRoutes from './routes/ai.js';
import portfolioRoutes from './routes/portfolio.js';
import notificationRoutes from './routes/notifications.js';
import streamRoutes from './routes/stream.js';
import settingsRoutes from './routes/settings.js';
import watchlistRoutes from './routes/watchlist.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Dukung banyak origin: pisahkan dengan koma di CLIENT_URLS
// Contoh .env: CLIENT_URLS=http://localhost:5173,http://localhost,http://127.0.0.1
const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Izinkan request tanpa origin (misal: curl, Postman, mobile apps)
      if (!requestOrigin) return callback(null, true);

      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, requestOrigin);
      }

      console.warn(`[CORS] Blocked origin: ${requestOrigin}`);
      return callback(new Error(`CORS: origin '${requestOrigin}' tidak diizinkan`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    optionsSuccessStatus: 204,
  })
);

app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/alerts', notificationRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Error Handler caught error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Boot the server
app.listen(PORT, () => {
  console.log(`[Express] Server is running beautifully on http://localhost:${PORT}`);
});
