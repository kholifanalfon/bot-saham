import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import {
  addTransaction,
  deleteTransaction,
  getTransactionsByUser,
  getPortfolioHoldings
} from '../services/portfolio.js';

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

export default router;
