import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runBilling } from '../services/billing.js';

const router = Router();

router.post('/run', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    res.json(await runBilling({ autoConfirm: !!req.body?.autoConfirm }));
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

export default router;
