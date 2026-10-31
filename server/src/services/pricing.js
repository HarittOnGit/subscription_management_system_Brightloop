import { prisma } from '../index.js';

const toPaise = (v) => Math.round(Number(v) * 100);
const fromPaise = (p) => p / 100;

/**
 * Works out what an invoice for this subscription should contain.
 * Does NOT write anything. Person 4 calls this inside their billing transaction,
 * then calls markDiscountsUsed() with appliedDiscountIds.
 */
export async function computeInvoiceAmounts(subscription, asOf = new Date(), tx = prisma) {
  const lines = await tx.subscriptionLine.findMany({
    where: { subscriptionId: subscription.id },
    include: { product: true, variant: true, tax: true },
  });

  const discounts = await tx.discount.findMany({
    where: { isActive: true, startDate: { lte: asOf }, endDate: { gte: asOf } },
  });

  const usable = discounts.filter((d) => d.usageLimit == null || d.timesUsed < d.usageLimit);

  const rows = lines.map((l) => ({
    line: l,
    sub: toPaise(l.unitPrice) * l.quantity,
    disc: 0,
  }));

  const applied = new Set();
  const amountOf = (d, base) =>
    d.type === 'PERCENT' ? Math.round((base * Number(d.value)) / 100) : toPaise(d.value);

  // 1) product-level discounts
  for (const d of usable.filter((x) => x.appliesTo === 'PRODUCT')) {
    for (const row of rows.filter((r) => r.line.productId === d.productId)) {
      if (d.minQuantity && row.line.quantity < d.minQuantity) continue;
      if (d.minPurchase && row.sub < toPaise(d.minPurchase)) continue;
      row.disc = Math.min(row.sub, row.disc + amountOf(d, row.sub));
      applied.add(d.id);
    }
  }

  // 2) whole-subscription discounts, spread across lines in proportion
  const totalQty = rows.reduce((s, r) => s + r.line.quantity, 0);
  const totalSub = rows.reduce((s, r) => s + r.sub, 0);

  for (const d of usable.filter((x) => x.appliesTo === 'SUBSCRIPTION')) {
    if (d.minQuantity && totalQty < d.minQuantity) continue;
    if (d.minPurchase && totalSub < toPaise(d.minPurchase)) continue;
    const remaining = rows.reduce((s, r) => s + (r.sub - r.disc), 0);
    if (remaining <= 0) continue;
    let amount = Math.min(amountOf(d, totalSub), remaining);
    let left = amount;
    rows.forEach((r, i) => {
      const room = r.sub - r.disc;
      const share = i === rows.length - 1 ? left : Math.min(room, Math.round((amount * r.sub) / (totalSub || 1)));
      r.disc += share;
      left -= share;
    });
    applied.add(d.id);
  }

  // 3) tax on (line amount - line discount)
  const out = rows.map((r) => {
    const taxable = r.sub - r.disc;
    const taxPercent = Number(r.line.tax?.percentage || 0);
    const taxAmt = Math.round((taxable * taxPercent) / 100);
    return {
      description: r.line.product.name + (r.line.variant ? ` (${r.line.variant.attribute}: ${r.line.variant.value})` : ''),
      productId: r.line.productId,
      quantity: r.line.quantity,
      unitPrice: Number(r.line.unitPrice),
      taxId: r.line.taxId,
      taxPercent,
      subtotal: fromPaise(r.sub),
      discountAmount: fromPaise(r.disc),
      taxAmount: fromPaise(taxAmt),
      lineTotal: fromPaise(taxable + taxAmt),
    };
  });

  const sum = (k) => out.reduce((s, l) => s + toPaise(l[k]), 0);

  return {
    lines: out,
    subtotal: fromPaise(sum('subtotal')),
    discountTotal: fromPaise(sum('discountAmount')),
    taxTotal: fromPaise(sum('taxAmount')),
    total: fromPaise(sum('lineTotal')),
    appliedDiscountIds: [...applied],
  };
}

/** Call once per invoice created, with computeInvoiceAmounts().appliedDiscountIds */
export async function markDiscountsUsed(ids, tx = prisma) {
  for (const id of ids) {
    await tx.discount.update({ where: { id }, data: { timesUsed: { increment: 1 } } });
  }
}
