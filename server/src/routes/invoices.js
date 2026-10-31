import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { invoiceStatusSchema } from '../schemas/billing.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const n = (v) => Number(v ?? 0);

const withDerived = (inv) => {
  const outstanding = Math.round((n(inv.total) - n(inv.amountPaid)) * 100) / 100;
  return { ...inv, outstanding, isOverdue: inv.status === 'CONFIRMED' && inv.dueDate < new Date() };
};

// LIST: filters + pagination. ?status= &overdue=true &customerId= &search= &from= &to=
router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const { status, overdue, customerId, search, from, to } = req.query;

  const where = {
    ...(status && { status }),
    ...(overdue === 'true' && { status: 'CONFIRMED', dueDate: { lt: new Date() } }),
    ...(customerId && { customerId }),
    ...((from || to) && {
      issueDate: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
    ...(search && {
      OR: [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { subscription: { number: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: { select: { number: true } },
      },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({ items: items.map(withDerived), total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      subscription: { select: { number: true } },
      lines: true,
      payments: { orderBy: { date: 'desc' } },
    },
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json(withDerived(inv));
});

// CONFIRM / CANCEL
const FLOW = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

router.patch('/:id/status', staffOrAdmin, async (req, res) => {
  const parsed = invoiceStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const { status } = parsed.data;
  if (!FLOW[inv.status]?.includes(status)) return res.status(400).json({ error: `Cannot change status to ${status}` });
  if (status === 'CANCELLED' && n(inv.amountPaid) > 0)
    return res.status(400).json({ error: 'Cannot cancel an invoice with payments' });

  res.json(await prisma.invoice.update({ where: { id: inv.id }, data: { status } }));
});

// SEND (log it and stamp sentAt)
router.post('/:id/send', staffOrAdmin, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (!['CONFIRMED', 'PAID'].includes(inv.status)) return res.status(400).json({ error: 'Only confirmed or paid invoices can be sent' });

  console.log(`[email] invoice ${inv.number} sent to ${inv.customer.email}`);
  res.json(await prisma.invoice.update({ where: { id: inv.id }, data: { sentAt: new Date() } }));
});

export default router;
