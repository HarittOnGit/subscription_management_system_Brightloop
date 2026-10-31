import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { taxSchema } from '../schemas/subscriptions.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.toString() || '';
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

  const [items, total] = await Promise.all([
    prisma.tax.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tax.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  const tax = await prisma.tax.findUnique({ where: { id: req.params.id } });
  if (!tax) return res.status(404).json({ error: 'Tax not found' });
  res.json(tax);
});

router.post('/', adminOnly, async (req, res) => {
  const parsed = taxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  res.status(201).json(await prisma.tax.create({ data: parsed.data }));
});

router.put('/:id', adminOnly, async (req, res) => {
  const parsed = taxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  res.json(await prisma.tax.update({ where: { id: req.params.id }, data: parsed.data }));
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.tax.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Tax is used in subscriptions' });
  }
});

export default router;
