import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { templateSchema } from '../schemas/catalog.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

const includeFull = {
  plan: true,
  lines: {
    include: {
      product: true,
      variant: true,
    },
  },
};

// GET list
router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.toString() || '';
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

  const [items, total] = await Promise.all([
    prisma.quotationTemplate.findMany({
      where,
      include: includeFull,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quotationTemplate.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// GET one
router.get('/:id', staffOrAdmin, async (req, res) => {
  const template = await prisma.quotationTemplate.findUnique({
    where: { id: req.params.id },
    include: includeFull,
  });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// POST
router.post('/', adminOnly, async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { lines, ...data } = parsed.data;
  const created = await prisma.quotationTemplate.create({
    data: { ...data, lines: { create: lines } },
    include: includeFull,
  });
  res.status(201).json(created);
});

// PUT
router.put('/:id', adminOnly, async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { lines, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.templateLine.deleteMany({ where: { templateId: req.params.id } });
    return tx.quotationTemplate.update({
      where: { id: req.params.id },
      data: {
        ...data,
        lines: { create: lines },
      },
      include: includeFull,
    });
  });

  res.json(updated);
});

// DELETE
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.quotationTemplate.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Cannot delete template' });
  }
});

export default router;
