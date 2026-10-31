import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { subscriptionSchema } from '../schemas/subscriptions.js';
import { computeInvoiceAmounts } from '../services/pricing.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];

const FLOW = {
  DRAFT: ['QUOTATION', 'CLOSED'],
  QUOTATION: ['CONFIRMED', 'DRAFT', 'CLOSED'],
  CONFIRMED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
};

const fullInclude = {
  customer: { select: { id: true, name: true, email: true } },
  plan: true,
  lines: { include: { product: true, variant: true, tax: true } },
};

async function nextNumber(tx) {
  const last = await tx.subscription.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  const n = last ? parseInt(last.number.split('-')[1], 10) + 1 : 1;
  return `SUB-${String(n).padStart(5, '0')}`;
}

async function checkPlan(tx, planId, lines) {
  const plan = await tx.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error('Plan is not available');
  const qty = lines.reduce((s, l) => s + l.quantity, 0);
  if (qty < plan.minQuantity) throw new Error(`This plan needs a minimum quantity of ${plan.minQuantity}`);
}

async function buildLines(tx, lines) {
  const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } });
  const variants = await tx.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId).filter(Boolean) } },
  });

  return lines.map((l) => {
    const p = products.find((x) => x.id === l.productId);
    if (!p) throw new Error('Product not found');
    const v = l.variantId ? variants.find((x) => x.id === l.variantId) : null;
    if (l.variantId && (!v || v.productId !== p.id)) throw new Error('Variant does not belong to product');
    const unitPrice = l.unitPrice ?? Number(p.salesPrice) + Number(v?.extraPrice || 0);
    return {
      productId: l.productId,
      variantId: l.variantId || null,
      quantity: l.quantity,
      unitPrice,
      taxId: l.taxId || null,
      amount: Math.round(unitPrice * l.quantity * 100) / 100,
    };
  });
}

// LIST (filters + pagination)
router.get('/', staffOrAdmin, async (req, res) => {
  // auto-close: active subscriptions past expiry whose plan has autoClose
  await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', expiryDate: { lt: new Date() }, plan: { autoClose: true } },
    data: { status: 'CLOSED', nextBillingDate: null },
  });

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const { status, customerId, search } = req.query;
  const where = {
    ...(status && { status }),
    ...(customerId && { customerId }),
    ...(search && {
      OR: [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } }, plan: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: fullInclude });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json(sub);
});

// Shows what the NEXT invoice would look like, with tax and discounts applied.
router.get('/:id/preview', staffOrAdmin, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json(await computeInvoiceAmounts(sub));
});

// CREATE (starts as DRAFT)
router.post('/', staffOrAdmin, async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const sub = await prisma.$transaction(async (tx) => {
      const { lines, ...data } = parsed.data;
      await checkPlan(tx, data.planId, lines);
      return tx.subscription.create({
        data: {
          ...data,
          number: await nextNumber(tx),
          lines: { create: await buildLines(tx, lines) },
        },
        include: fullInclude,
      });
    });
    res.status(201).json(sub);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// CREATE FROM QUOTATION TEMPLATE
router.post('/from-template/:templateId', staffOrAdmin, async (req, res) => {
  const { customerId, startDate, paymentTerms = 'NET_30' } = req.body;
  if (!customerId || !startDate) return res.status(400).json({ error: 'Customer and startDate are required' });

  const t = await prisma.quotationTemplate.findUnique({
    where: { id: req.params.templateId },
    include: { plan: true, lines: true },
  });
  if (!t) return res.status(404).json({ error: 'Template not found' });

  const start = new Date(startDate);
  const expiry = new Date(start);
  expiry.setFullYear(expiry.getFullYear() + 1);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + t.validityDays);

  const lines = t.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));

  try {
    const sub = await prisma.$transaction(async (tx) => {
      await checkPlan(tx, t.planId, lines);
      return tx.subscription.create({
        data: {
          number: await nextNumber(tx),
          customerId,
          planId: t.planId,
          templateId: t.id,
          startDate: start,
          expiryDate: expiry,
          paymentTerms,
          quotationValidUntil: validUntil,
          status: 'QUOTATION',
          lines: { create: await buildLines(tx, lines) },
        },
        include: fullInclude,
      });
    });
    res.status(201).json(sub);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// EDIT (only while DRAFT)
router.put('/:id', staffOrAdmin, async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const existing = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft subscriptions can be edited' });

  try {
    const sub = await prisma.$transaction(async (tx) => {
      const { lines, ...data } = parsed.data;
      await checkPlan(tx, data.planId, lines);
      await tx.subscriptionLine.deleteMany({ where: { subscriptionId: existing.id } });
      return tx.subscription.update({
        where: { id: existing.id },
        data: {
          ...data,
          lines: { create: await buildLines(tx, lines) },
        },
        include: fullInclude,
      });
    });
    res.json(sub);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// STATUS CHANGE (the state machine)
router.patch('/:id/status', staffOrAdmin, async (req, res) => {
  const { status } = req.body;
  const sub = await prisma.subscription.findUnique({
    where: { id: req.params.id },
    include: { plan: true, lines: true },
  });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  if (!FLOW[sub.status]?.includes(status))
    return res.status(400).json({ error: `Cannot move from ${sub.status} to ${status}` });

  if (status === 'QUOTATION' && sub.lines.length === 0)
    return res.status(400).json({ error: 'Add at least one line first' });

  if (status === 'CONFIRMED' && sub.status === 'QUOTATION' && sub.quotationValidUntil && sub.quotationValidUntil < new Date())
    return res.status(400).json({ error: 'This quotation has expired' });

  if (sub.status === 'ACTIVE' && status === 'CLOSED' && !sub.plan.allowClose)
    return res.status(400).json({ error: 'This plan cannot be closed early' });

  const data = { status };
  if (status === 'ACTIVE') data.nextBillingDate = sub.startDate; // Person 4's billing picks this up
  if (status === 'CLOSED') data.nextBillingDate = null;

  res.json(await prisma.subscription.update({ where: { id: sub.id }, data, include: fullInclude }));
});

router.delete('/:id', staffOrAdmin, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft subscriptions can be deleted' });
  await prisma.subscription.delete({ where: { id: sub.id } });
  res.json({ ok: true });
});

export default router;
