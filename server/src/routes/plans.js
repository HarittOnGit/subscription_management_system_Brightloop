import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { planSchema } from '../schemas/catalog.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

// GET list with auto-close logic + search + pagination
router.get('/', staffOrAdmin, async (req, res) => {
  // Auto-close expired auto-close plans
  await prisma.plan.updateMany({
    where: { autoClose: true, isActive: true, availableTo: { lt: new Date() } },
    data: { isActive: false },
  });

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.toString() || '';
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

  const [items, total] = await Promise.all([
    prisma.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.plan.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

router.post('/', adminOnly, async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  res.status(201).json(await prisma.plan.create({ data: parsed.data }));
});

router.put('/:id', adminOnly, async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  res.json(await prisma.plan.update({ where: { id: req.params.id }, data: parsed.data }));
});

router.patch('/:id/close', adminOnly, async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  if (!plan.allowClose) return res.status(400).json({ error: 'This plan cannot be closed early' });
  const updated = await prisma.plan.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json(updated);
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.plan.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Cannot delete: plan is in use' });
  }
});

export default router;
