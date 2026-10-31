import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const n = (v) => Number(v ?? 0);

router.get('/summary', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const now = new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const to = req.query.to ? new Date(req.query.to) : new Date(now);
  to.setUTCHours(23, 59, 59, 999);

  try {
    const [active, byStatus, revenue, invoiced, open, overdue, payM, invM] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.invoice.groupBy({ by: ['status'], where: { issueDate: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { date: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { status: { not: 'CANCELLED' }, issueDate: { gte: from, lte: to } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'CONFIRMED' }, _sum: { total: true, amountPaid: true }, _count: { _all: true } }),
      prisma.invoice.aggregate({ where: { status: 'CONFIRMED', dueDate: { lt: now } }, _sum: { total: true, amountPaid: true }, _count: { _all: true } }),
      prisma.$queryRaw`SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, SUM("amount")::float AS total FROM "Payment" WHERE "date" >= ${from} AND "date" <= ${to} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw`SELECT to_char(date_trunc('month', "issueDate"), 'YYYY-MM') AS month, SUM("total")::float AS total FROM "Invoice" WHERE "status" <> 'CANCELLED' AND "issueDate" >= ${from} AND "issueDate" <= ${to} GROUP BY 1 ORDER BY 1`,
    ]);

    // merge the two monthly series into one array for the chart
    const months = {};
    invM.forEach((r) => (months[r.month] = { month: r.month, invoiced: Number(r.total || 0), collected: 0 }));
    payM.forEach((r) => {
      months[r.month] ||= { month: r.month, invoiced: 0, collected: 0 };
      months[r.month].collected = Number(r.total || 0);
    });

    res.json({
      activeSubscriptions: active,
      revenueCollected: n(revenue._sum.amount),
      totalInvoiced: n(invoiced._sum.total),
      outstanding: { amount: n(open._sum.total) - n(open._sum.amountPaid), count: open._count._all },
      overdue: { amount: n(overdue._sum.total) - n(overdue._sum.amountPaid), count: overdue._count._all },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      monthly: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
