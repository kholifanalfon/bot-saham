import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import {
  addTransaction,
  deleteTransaction,
  getTransactionsByUser,
  getPortfolioHoldings
} from '../services/portfolio.js';
import { query } from '../services/db.js';
import {
  upsertJournal,
  getJournalsByUser,
  deleteJournal,
  getTagAnalytics,
} from '../services/portfolio-journal.js';
import { suggestTradeTags } from '../services/gemini-ai.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const summary = await getPortfolioHoldings(userId);
    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching portfolio summary' });
  }
});

router.post('/transaction', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { symbol, type, shares, price, date, notes } = req.body;

  if (!symbol || !type || !shares || !price || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (shares <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Shares and price must be greater than zero' });
  }

  try {
    const tx = await addTransaction(userId, symbol, type, shares, price, date, notes);
    return res.status(201).json(tx);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error recording transaction' });
  }
});

router.get('/history', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const history = await getTransactionsByUser(userId);
    return res.status(200).json(history);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching transaction history' });
  }
});

router.delete('/transaction/:id', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const success = await deleteTransaction(req.params.id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }
    
    return res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error deleting transaction' });
  }
});

router.get('/swing-recap', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const txs = await getTransactionsByUser(userId);

    // Sort chronologically
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Per-symbol FIFO queue to match buy→sell pairs
    const buyQueues: Record<string, Array<{ shares: number; price: number; date: string }>> = {};
    const closedTrades: Array<{
      symbol: string;
      buyDate: string;
      sellDate: string;
      shares: number;
      buyPrice: number;
      sellPrice: number;
      realizedPnl: number;
      pnlPercent: number;
      holdingDays: number;
    }> = [];

    for (const tx of txs) {
      const sym = tx.symbol;
      if (!buyQueues[sym]) buyQueues[sym] = [];

      if (tx.type === 'buy') {
        buyQueues[sym].push({ shares: tx.shares, price: tx.price, date: tx.date });
      } else if (tx.type === 'sell') {
        let remainingSell = tx.shares;
        while (remainingSell > 0 && buyQueues[sym]?.length > 0) {
          const oldestBuy = buyQueues[sym][0];
          const matchedShares = Math.min(remainingSell, oldestBuy.shares);
          const realizedPnl = (tx.price - oldestBuy.price) * matchedShares;
          const pnlPercent = oldestBuy.price > 0 ? ((tx.price - oldestBuy.price) / oldestBuy.price) * 100 : 0;
          const buyDate = new Date(oldestBuy.date);
          const sellDate = new Date(tx.date);
          const holdingDays = Math.max(0, Math.round((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));

          closedTrades.push({
            symbol: sym,
            buyDate: oldestBuy.date,
            sellDate: tx.date,
            shares: matchedShares,
            buyPrice: oldestBuy.price,
            sellPrice: tx.price,
            realizedPnl,
            pnlPercent,
            holdingDays
          });

          oldestBuy.shares -= matchedShares;
          remainingSell -= matchedShares;
          if (oldestBuy.shares <= 0) buyQueues[sym].shift();
        }
      }
    }

    // Aggregate statistics
    const totalProfit = closedTrades.filter(t => t.realizedPnl > 0).reduce((s, t) => s + t.realizedPnl, 0);
    const totalLoss = closedTrades.filter(t => t.realizedPnl <= 0).reduce((s, t) => s + t.realizedPnl, 0);
    const winCount = closedTrades.filter(t => t.realizedPnl > 0).length;
    const lossCount = closedTrades.filter(t => t.realizedPnl <= 0).length;
    const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;
    const netPnl = totalProfit + totalLoss;
    const avgHoldingDays = closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + t.holdingDays, 0) / closedTrades.length
      : 0;

    const bestTrade = closedTrades.reduce<typeof closedTrades[0] | null>((best, t) => (!best || t.realizedPnl > best.realizedPnl) ? t : best, null);
    const worstTrade = closedTrades.reduce<typeof closedTrades[0] | null>((worst, t) => (!worst || t.realizedPnl < worst.realizedPnl) ? t : worst, null);

    // Per-symbol summary
    const symbolMap: Record<string, { symbol: string; trades: number; wins: number; totalPnl: number; totalVolume: number }> = {};
    for (const t of closedTrades) {
      if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { symbol: t.symbol, trades: 0, wins: 0, totalPnl: 0, totalVolume: 0 };
      symbolMap[t.symbol].trades++;
      symbolMap[t.symbol].totalPnl += t.realizedPnl;
      symbolMap[t.symbol].totalVolume += t.shares * t.buyPrice;
      if (t.realizedPnl > 0) symbolMap[t.symbol].wins++;
    }
    const bySymbol = Object.values(symbolMap).sort((a, b) => b.totalPnl - a.totalPnl);

    return res.status(200).json({
      summary: { totalProfit, totalLoss, netPnl, winCount, lossCount, winRate, avgHoldingDays, totalTrades: closedTrades.length },
      bestTrade,
      worstTrade,
      closedTrades: closedTrades.slice().reverse(), // newest first
      bySymbol
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error computing swing recap' });
  }
});

// ─────────────────────────────────────────────────────────────
// TRADE JOURNALS — CRUD
// ─────────────────────────────────────────────────────────────

// GET /api/portfolio/journals — list all journals for user
router.get('/journals', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const journals = await getJournalsByUser(userId);
    return res.status(200).json(journals);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching journals' });
  }
});

// GET /api/portfolio/journals/tag-analytics — win rate per tag
router.get('/journals/tag-analytics', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const analytics = await getTagAnalytics(userId);
    return res.status(200).json(analytics);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error computing tag analytics' });
  }
});

// POST /api/portfolio/journals — create or update a journal entry
router.post('/journals', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { symbol, sellDate, buyDate, buyPrice, sellPrice, shares, pnlPercent, notes, tags, aiTags } = req.body;

  if (!symbol || !sellDate || !buyDate) {
    return res.status(400).json({ error: 'symbol, sellDate, buyDate are required' });
  }

  try {
    const journal = await upsertJournal(userId, symbol, sellDate, buyDate, {
      buyPrice, sellPrice, shares, pnlPercent, notes, tags, aiTags,
    });
    return res.status(200).json(journal);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error saving journal' });
  }
});

// PATCH /api/portfolio/journals/update — update notes & tags
router.patch('/journals/update', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { symbol, sellDate, buyDate, notes, tags } = req.body;

  if (!symbol || !sellDate || !buyDate) {
    return res.status(400).json({ error: 'symbol, sellDate, buyDate are required' });
  }

  try {
    const journal = await upsertJournal(userId, symbol, sellDate, buyDate, { notes, tags });
    return res.status(200).json(journal);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating journal' });
  }
});

// DELETE /api/portfolio/journals/:id — delete a journal
router.delete('/journals/:id', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const success = await deleteJournal(req.params.id, userId);
    if (!success) return res.status(404).json({ error: 'Journal not found or unauthorized' });
    return res.status(200).json({ message: 'Journal deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error deleting journal' });
  }
});

// POST /api/portfolio/journals/suggest-tags — AI tag suggestion
router.post('/journals/suggest-tags', async (req: AuthRequest, res) => {
  const { symbol, buyDate, sellDate, buyPrice, sellPrice, shares, pnlPercent, holdingDays, notes } = req.body;

  if (!symbol || !buyDate || !sellDate) {
    return res.status(400).json({ error: 'symbol, buyDate, sellDate required' });
  }

  try {
    const tags = await suggestTradeTags({
      symbol, buyDate, sellDate,
      buyPrice: parseFloat(buyPrice) || 0,
      sellPrice: parseFloat(sellPrice) || 0,
      shares: parseFloat(shares) || 0,
      pnlPercent: parseFloat(pnlPercent) || 0,
      holdingDays: parseInt(holdingDays) || 0,
      notes,
    });
    return res.status(200).json({ tags });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error suggesting tags' });
  }
});

export default router;
