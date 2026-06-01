import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import { query } from '../services/db.js';

const router = Router();

router.use(requireAuth);

// Get user's watchlist symbols
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const result = await query('SELECT symbol FROM watchlist WHERE user_id = $1', [userId]);
    const symbols = result.rows.map(row => row.symbol);
    return res.status(200).json(symbols);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch watchlist' });
  }
});

// Add symbol to watchlist
router.post('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { symbol } = req.body;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  const cleanSymbol = symbol.toUpperCase();
  try {
    await query(
      `INSERT INTO watchlist (user_id, symbol)
       VALUES ($1, $2)
       ON CONFLICT (user_id, symbol) DO NOTHING`,
      [userId, cleanSymbol]
    );
    return res.status(200).json({ message: 'Added to watchlist successfully', symbol: cleanSymbol });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to add to watchlist' });
  }
});

// Remove symbol from watchlist
router.delete('/:symbol', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const symbol = req.params.symbol.toUpperCase();
  try {
    await query('DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2', [userId, symbol]);
    return res.status(200).json({ message: 'Removed from watchlist successfully', symbol });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to remove from watchlist' });
  }
});

export default router;
