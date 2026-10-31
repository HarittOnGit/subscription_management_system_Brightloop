import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paymentSchema } from '../schemas/billing.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const toPaise = (v) => Math.round(Number(v) * 100);

router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const { method, invoiceId, from, to } = req.query;
  const where = {
    ...(method && { method }),
    ...(invoiceId && { invoiceId }),
    ...((from || to) && {
      date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// RECORD A PAYMENT against an invoice
router.post('/', staffOrAdmin, async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { invoiceId, method, amount, date, note } = parsed.data;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv) throw new Error('Invoice not found');
      if (inv.status !== 'CONFIRMED') throw new Error('Only confirmed, unpaid invoices can receive payments');

      const outstanding = toPaise(inv.total) - toPaise(inv.amountPaid);
      if (toPaise(amount) > outstanding) throw new Error('Amount is more than the outstanding balance');

      const paid = toPaise(inv.amountPaid) + toPaise(amount);
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: paid / 100,
          status: paid >= toPaise(inv.total) ? 'PAID' : 'CONFIRMED',
        },
      });

      return tx.payment.create({ data: { invoiceId, method, amount, date, note } });
    });

    res.status(201).json(payment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
