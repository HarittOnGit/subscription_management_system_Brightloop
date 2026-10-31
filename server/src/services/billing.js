import { prisma } from '../index.js';
import { computeInvoiceAmounts, markDiscountsUsed } from './pricing.js';

const DAY = 86400000;
const TERMS_DAYS = { IMMEDIATE: 0, NET_15: 15, NET_30: 30, NET_60: 60 };
const MAX_PERIODS_PER_RUN = 60; // safety cap so a bad date can't loop forever

const utcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function addPeriod(date, period) {
  const y = date.getUTCFullYear(),
    m = date.getUTCMonth(),
    d = date.getUTCDate();
  switch (period) {
    case 'DAILY':
      return new Date(Date.UTC(y, m, d + 1));
    case 'WEEKLY':
      return new Date(Date.UTC(y, m, d + 7));
    case 'MONTHLY': {
      const last = new Date(Date.UTC(y, m + 2, 0)).getUTCDate(); // days in next month
      return new Date(Date.UTC(y, m + 1, Math.min(d, last)));
    }
    case 'YEARLY': {
      const last = new Date(Date.UTC(y + 1, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y + 1, m, Math.min(d, last)));
    }
    default:
      throw new Error(`Unknown billing period ${period}`);
  }
}

async function nextInvoiceNumber(tx) {
  const last = await tx.invoice.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  const n = last ? parseInt(last.number.split('-')[1], 10) + 1 : 1;
  return `INV-${String(n).padStart(5, '0')}`;
}

// Bills ONE period of ONE subscription, and moves nextBillingDate forward. All or nothing.
async function billOnePeriod(sub, periodStart, autoConfirm) {
  const nextStart = addPeriod(periodStart, sub.plan.billingPeriod);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { subscriptionId_periodStart: { subscriptionId: sub.id, periodStart } },
    });

    let created = false;
    if (!existing) {
      const amounts = await computeInvoiceAmounts(sub, new Date(), tx);
      if (amounts.lines.length === 0) throw new Error('Subscription has no lines');

      await tx.invoice.create({
        data: {
          number: await nextInvoiceNumber(tx),
          subscriptionId: sub.id,
          customerId: sub.customerId,
          periodStart,
          periodEnd: new Date(nextStart.getTime() - DAY),
          issueDate: periodStart,
          dueDate: new Date(periodStart.getTime() + TERMS_DAYS[sub.paymentTerms] * DAY),
          status: autoConfirm ? 'CONFIRMED' : 'DRAFT',
          subtotal: amounts.subtotal,
          discountTotal: amounts.discountTotal,
          taxTotal: amounts.taxTotal,
          total: amounts.total,
          lines: {
            create: amounts.lines.map((l) => ({
              description: l.description,
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              subtotal: l.subtotal,
              discountAmount: l.discountAmount,
              taxPercent: l.taxPercent,
              taxAmount: l.taxAmount,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      await markDiscountsUsed(amounts.appliedDiscountIds, tx);
      created = true;
    }

    // move the clock forward (even if the invoice already existed, so the system heals)
    const finished = nextStart > sub.expiryDate;
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        nextBillingDate: finished ? null : nextStart,
        ...(finished && sub.plan.autoClose ? { status: 'CLOSED' } : {}),
      },
    });

    return created;
  });
}

let running = false; // stops two runs at the same time inside this server

export async function runBilling({ asOf = new Date(), autoConfirm = false } = {}) {
  if (running) throw new Error('Billing is already running');
  running = true;
  const result = { subscriptionsChecked: 0, invoicesCreated: 0, skipped: 0, failed: [] };

  try {
    const today = utcDay(asOf);
    const due = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextBillingDate: { lte: asOf } },
      include: { plan: true },
    });

    result.subscriptionsChecked = due.length;

    for (const sub of due) {
      let next = utcDay(sub.nextBillingDate);
      let guard = 0;
      try {
        // while loop = catch-up: if we missed 3 months, we bill all 3 (nothing skipped)
        while (next <= today && next <= sub.expiryDate && guard++ < MAX_PERIODS_PER_RUN) {
          try {
            const created = await billOnePeriod(sub, next, autoConfirm);
            created ? result.invoicesCreated++ : result.skipped++;
          } catch (e) {
            if (e.code === 'P2002') result.skipped++; // unique constraint: already billed
            else throw e;
          }
          next = addPeriod(next, sub.plan.billingPeriod);
        }
      } catch (e) {
        result.failed.push({ subscription: sub.number, error: e.message }); // one bad egg doesn't spoil the batch
      }
    }

    return result;
  } finally {
    running = false;
  }
}
