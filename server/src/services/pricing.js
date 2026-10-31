const toPaise = (value) => Math.round(Number(value) * 100);
const fromPaise = (value) => Number((value / 100).toFixed(2));

async function computeInvoiceAmounts(subscription, asOf = new Date(), tx) {
  if (!tx) throw new Error("A Prisma transaction/client is required");
  if (!subscription || !Array.isArray(subscription.lines)) {
    throw new Error("Subscription with lines is required");
  }

  const [allDiscounts, taxes] = await Promise.all([
    tx.discount.findMany({ where: { isActive: true } }),
    tx.tax.findMany({ where: { isActive: true } }),
  ]);

  const taxById = new Map(
    taxes.map((tax) => [tax.id, Number(tax.percentage)])
  );

  const lines = subscription.lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitPricePaise = toPaise(line.unitPrice);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for subscription line ${line.id}`);
    }
    if (!Number.isFinite(unitPricePaise) || unitPricePaise < 0) {
      throw new Error(`Invalid unit price for subscription line ${line.id}`);
    }

    const subtotalPaise = quantity * unitPricePaise;

    return {
      ...line,
      quantity,
      unitPrice: fromPaise(unitPricePaise),
      subtotal: fromPaise(subtotalPaise),
      discount: 0,
      tax: 0,
      total: fromPaise(subtotalPaise),
    };
  });

  const subtotalPaise = lines.reduce(
    (sum, line) => sum + toPaise(line.subtotal),
    0
  );

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  const eligibleDiscounts = allDiscounts.filter((discount) => {
    if (discount.startDate && new Date(discount.startDate) > asOf) return false;
    if (discount.endDate && new Date(discount.endDate) < asOf) return false;
    if (
      discount.usageLimit != null &&
      discount.timesUsed >= discount.usageLimit
    ) {
      return false;
    }
    if (
      discount.minPurchase != null &&
      subtotalPaise < toPaise(discount.minPurchase)
    ) {
      return false;
    }
    if (
      discount.minQuantity != null &&
      totalQuantity < discount.minQuantity
    ) {
      return false;
    }
    if (
      discount.appliesTo === "PRODUCT" &&
      !lines.some((line) => line.productId === discount.productId)
    ) {
      return false;
    }
    return true;
  });

  let discountTotalPaise = 0;
  const appliedDiscountIds = [];

  // Applies the first eligible discount only; see note below.
  const discount = eligibleDiscounts[0];

  if (discount) {
    const matchingLines =
      discount.appliesTo === "PRODUCT"
        ? lines.filter((line) => line.productId === discount.productId)
        : lines;

    const discountablePaise = matchingLines.reduce(
      (sum, line) => sum + toPaise(line.subtotal),
      0
    );

    let amountPaise =
      discount.type === "PERCENT"
        ? Math.round(
            (discountablePaise * Number(discount.value)) / 100
          )
        : toPaise(discount.value);

    amountPaise = Math.min(amountPaise, discountablePaise);

    // Distribute the discount across matching lines in order.
    let remainingPaise = amountPaise;
    for (const line of matchingLines) {
      const lineSubtotalPaise = toPaise(line.subtotal);
      const lineDiscountPaise = Math.min(lineSubtotalPaise, remainingPaise);

      line.discount = fromPaise(lineDiscountPaise);
      remainingPaise -= lineDiscountPaise;

      if (remainingPaise === 0) break;
    }

    discountTotalPaise = amountPaise;
    if (amountPaise > 0) appliedDiscountIds.push(discount.id);
  }

  let taxTotalPaise = 0;

  for (const line of lines) {
    const lineSubtotalPaise = toPaise(line.subtotal);
    const lineDiscountPaise = toPaise(line.discount);
    const taxablePaise = Math.max(0, lineSubtotalPaise - lineDiscountPaise);
    const taxRate = line.taxId ? taxById.get(line.taxId) : undefined;

    const lineTaxPaise =
      taxRate == null ? 0 : Math.round((taxablePaise * taxRate) / 100);

    line.tax = fromPaise(lineTaxPaise);
    line.total = fromPaise(taxablePaise + lineTaxPaise);
    taxTotalPaise += lineTaxPaise;
  }

  return {
    lines,
    subtotal: fromPaise(subtotalPaise),
    discountTotal: fromPaise(discountTotalPaise),
    taxTotal: fromPaise(taxTotalPaise),
    total: fromPaise(subtotalPaise - discountTotalPaise + taxTotalPaise),
    appliedDiscountIds,
  };
}

async function markDiscountsUsed(ids, tx) {
  if (!tx) throw new Error("A Prisma transaction/client is required");

  const uniqueIds = [...new Set(ids || [])];
  if (uniqueIds.length === 0) return;

  await tx.discount.updateMany({
    where: { id: { in: uniqueIds } },
    data: { timesUsed: { increment: 1 } },
  });
}

module.exports = {
  computeInvoiceAmounts,
  markDiscountsUsed,
};