import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const customerOnly = [requireAuth, requireRole('CUSTOMER')];
const VISIBLE = ['CONFIRMED', 'PAID']; // customers never see draft or cancelled invoices

const derive = (inv) => {
  const outstanding = Math.round((Number(inv.total) - Number(inv.amountPaid)) * 100) / 100;
  return { ...inv, outstanding, isOverdue: inv.status === 'CONFIRMED' && inv.dueDate < new Date() };
};

router.get('/subscriptions', customerOnly, async (req, res) => {
  const items = await prisma.subscription.findMany({
    where: { customerId: req.user.id, status: { not: 'DRAFT' } },
    include: { plan: true, lines: { include: { product: true, variant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

router.get('/invoices', customerOnly, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const where = { customerId: req.user.id, status: { in: VISIBLE } };
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { subscription: { select: { number: true } } },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ items: items.map(derive), total, page, pages: Math.ceil(total / limit) });
});

router.get('/invoices/:id', customerOnly, async (req, res) => {
  const inv = await prisma.invoice.findFirst({
    where: { id: req.params.id, customerId: req.user.id, status: { in: VISIBLE } },
    include: { lines: true, payments: { orderBy: { date: 'desc' } }, subscription: { select: { number: true } } },
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' }); // 404, not 403 (avoid enumeration)
  res.json(derive(inv));
});

export default router;
