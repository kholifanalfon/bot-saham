import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import {
  createAlert,
  getActiveAlerts,
  deleteAlert,
  getTriggeredAlertsByUser,
  markAlertAsRead,
  clearUserAlerts
} from '../services/alert-engine.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const activeAlerts = await getActiveAlerts(userId);
    return res.status(200).json(activeAlerts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching active alerts' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { symbol, type, targetValue } = req.body;

  if (!symbol || !type) {
    return res.status(400).json({ error: 'Symbol and type are required' });
  }

  try {
    const alert = await createAlert(userId, symbol, type, targetValue);
    return res.status(201).json(alert);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creating alert rule' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const success = await deleteAlert(req.params.id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Alert rule not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Alert rule deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error deleting alert rule' });
  }
});

router.get('/triggered', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const triggered = await getTriggeredAlertsByUser(userId);
    return res.status(200).json(triggered);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching triggered alerts' });
  }
});

router.patch('/triggered/:id/read', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const success = await markAlertAsRead(req.params.id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Alert not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Alert marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error marking alert as read' });
  }
});

router.delete('/triggered/clear', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    await clearUserAlerts(userId);
    return res.status(200).json({ message: 'Triggered alerts cleared' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error clearing alerts' });
  }
});

export default router;
