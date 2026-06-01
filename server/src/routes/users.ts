import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  getUserStats
} from '../services/user-management.js';

const router = Router();

// Apply requireAuth and requireAdmin globally to this router
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const role = req.query.role as any;
  const status = req.query.status !== undefined ? req.query.status === 'true' : undefined;

  try {
    const result = await getAllUsers(page, limit, search, role, status);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching users' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching user stats' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching user' });
  }
});

router.post('/', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = await createUser(email, password, name, role);
    const { passwordHash: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error creating user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error updating user' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const updated = await toggleUserStatus(req.params.id);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error updating status' });
  }
});

router.patch('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    await resetUserPassword(req.params.id, password);
    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error resetting password' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteUser(req.params.id);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error deleting user' });
  }
});

export default router;
