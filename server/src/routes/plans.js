import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { planSchema, planUpdateSchema } from '../schemas/catalog.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

function databaseError(res, error, action) {
  console.error(`${action} plan error:`, error);
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Plan not found' });
  }
  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({ error: 'Cannot delete a plan used by a template or subscription' });
  }
  return res.status(500).json({ error: `Failed to ${action} plan` });
}

router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const search = String(req.query.search ?? '').trim();

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Page must be positive and limit must be between 1 and 100' });
  }

  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  try {
    await prisma.plan.updateMany({
      where: { autoClose: true, isActive: true, availableTo: { lt: new Date() } },
      data: { isActive: false },
    });

    const [items, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.plan.count({ where }),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    return res.json(plan);
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.post('/', adminOnly, async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    return res.status(201).json(await prisma.plan.create({ data: parsed.data }));
  } catch (error) {
    return databaseError(res, error, 'create');
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    return res.json(await prisma.plan.update({
      where: { id: req.params.id },
      data: parsed.data,
    }));
  } catch (error) {
    return databaseError(res, error, 'update');
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.plan.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    return databaseError(res, error, 'delete');
  }
});

router.patch('/:id/close', adminOnly, async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (!plan.allowClose) {
      return res.status(400).json({ error: 'This plan cannot be closed early' });
    }

    return res.json(await prisma.plan.update({
      where: { id: req.params.id },
      data: { isActive: false },
    }));
  } catch (error) {
    return databaseError(res, error, 'close');
  }
});

export default router;
