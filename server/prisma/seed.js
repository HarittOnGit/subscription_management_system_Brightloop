// Setting PORT=0 stops importing index.js from clashing with a running server
process.env.PORT = '0';
const { prisma } = await import('../src/index.js');
const { runBilling } = await import('../src/services/billing.js');
const bcrypt = (await import('bcryptjs')).default;

const DAY = 86400000;
const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * DAY);
const daysAhead = (d) => new Date(now.getTime() + d * DAY);
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];

console.log('Wiping old data...');
for (const m of [
  'payment',
  'invoiceLine',
  'invoice',
  'subscriptionLine',
  'subscription',
  'templateLine',
  'quotationTemplate',
  'discount',
  'tax',
  'productVariant',
  'product',
  'plan',
  'user',
]) {
  if (prisma[m]) {
    await prisma[m].deleteMany();
  }
}

console.log('Users...');
const hash = await bcrypt.hash('Password@123', 8);
await prisma.user.create({ data: { email: 'admin@brightloop.com', name: 'Admin', passwordHash: hash, role: 'ADMIN' } });
await prisma.user.create({ data: { email: 'staff@brightloop.com', name: 'Staff Member', passwordHash: hash, role: 'STAFF' } });

const first = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Isha', 'Vikram', 'Anaya'];
const last = ['Nair', 'Menon', 'Iyer', 'Kumar', 'Shah', 'Pillai', 'Das', 'Rao'];
const customers = [];
for (let i = 1; i <= 40; i++) {
  customers.push(
    await prisma.user.create({
      data: {
        email: `customer${i}@example.com`,
        name: `${pick(first)} ${pick(last)} Pvt Ltd`,
        passwordHash: hash,
        role: 'CUSTOMER',
      },
    })
  );
}

console.log('Taxes, products, plans, discounts...');
const taxes = await Promise.all(
  [5, 12, 18].map((p) => prisma.tax.create({ data: { name: `GST ${p}%`, percentage: p } }))
);

const productData = [
  ['Brightloop CRM', 'Software', 1500, 600],
  ['Brightloop Invoicing', 'Software', 1200, 500],
  ['Brightloop HR Suite', 'Software', 2500, 900],
  ['Brightloop Support Desk', 'Add-on', 800, 300],
  ['Brightloop Analytics', 'Add-on', 1800, 700],
];

const products = [];
for (const [name, type, salesPrice, costPrice] of productData) {
  const p = await prisma.product.create({ data: { name, type, salesPrice, costPrice, notes: 'Core catalog item' } });
  await prisma.productVariant.createMany({
    data: [
      { productId: p.id, attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
      { productId: p.id, attribute: 'Brand', value: 'Zoho', extraPrice: 320 },
    ],
  });
  products.push({ ...p, variants: await prisma.productVariant.findMany({ where: { productId: p.id } }) });
}

const mkPlan = (name, price, billingPeriod) =>
  prisma.plan.create({
    data: {
      name,
      price,
      billingPeriod,
      minQuantity: 1,
      availableFrom: daysAgo(400),
      availableTo: daysAhead(400),
      autoClose: true,
      allowClose: true,
      allowPause: true,
      allowRenew: true,
    },
  });

const monthly = await mkPlan('Monthly Standard', 999, 'MONTHLY');
const yearly = await mkPlan('Yearly Business', 9999, 'YEARLY');
const weekly = await mkPlan('Weekly Starter', 299, 'WEEKLY');
await mkPlan('Daily Trial', 49, 'DAILY');

await prisma.discount.create({
  data: {
    name: '10% off CRM',
    type: 'PERCENT',
    value: 10,
    appliesTo: 'PRODUCT',
    productId: products[0].id,
    startDate: daysAgo(120),
    endDate: daysAhead(60),
  },
});

await prisma.discount.create({
  data: {
    name: '₹500 off big accounts',
    type: 'FIXED',
    value: 500,
    appliesTo: 'SUBSCRIPTION',
    startDate: daysAgo(120),
    endDate: daysAhead(60),
    usageLimit: 40,
  },
});

console.log('Subscriptions...');
let seq = 0;
for (let i = 0; i < 200; i++) {
  const r = Math.random();
  const [plan, startAgo] = r < 0.7 ? [monthly, rand(1, 170)] : r < 0.9 ? [yearly, rand(1, 300)] : [weekly, rand(1, 60)];
  const start = daysAgo(startAgo);
  const s = Math.random();
  const status = s < 0.85 ? 'ACTIVE' : s < 0.92 ? 'CLOSED' : pick(['DRAFT', 'QUOTATION', 'CONFIRMED']);

  const lines = Array.from({ length: rand(1, 2) }, () => {
    const p = pick(products);
    const v = Math.random() < 0.5 ? pick(p.variants) : null;
    const quantity = rand(1, 10);
    const unitPrice = Number(p.salesPrice) + Number(v?.extraPrice || 0);
    return {
      productId: p.id,
      variantId: v?.id ?? null,
      quantity,
      unitPrice,
      taxId: pick(taxes).id,
      amount: Math.round(unitPrice * quantity * 100) / 100,
    };
  });

  seq++;
  await prisma.subscription.create({
    data: {
      number: `SUB-${String(seq).padStart(5, '0')}`,
      customerId: pick(customers).id,
      planId: plan.id,
      startDate: start,
      expiryDate: new Date(start.getTime() + 365 * DAY),
      paymentTerms: pick(['IMMEDIATE', 'NET_15', 'NET_30', 'NET_30', 'NET_60']),
      status,
      nextBillingDate: status === 'ACTIVE' ? start : null,
      lines: { create: lines },
    },
  });
}

console.log('Running the real billing engine (can take 30-90 seconds)...');
console.log(await runBilling({ asOf: now }));
console.log('Run it again: nothing should be created.');
console.log(await runBilling({ asOf: now }));

console.log('Confirming invoices and recording payments...');
await prisma.invoice.updateMany({
  where: { status: 'DRAFT', number: { not: { endsWith: '9' } } },
  data: { status: 'CONFIRMED' },
});

const confirmed = await prisma.invoice.findMany({ where: { status: 'CONFIRMED' } });
const methods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

for (const inv of confirmed) {
  const roll = Math.random();
  if (roll > 0.8) continue; // 20% stay unpaid, the older ones become overdue
  const total = Number(inv.total);
  const amount = roll < 0.7 ? total : Math.round(total * 0.5 * 100) / 100; // 70% full, 30% partial
  const date = new Date(Math.min(now.getTime(), inv.issueDate.getTime() + rand(0, 20) * DAY));
  await prisma.payment.create({
    data: { invoiceId: inv.id, method: pick(methods), amount, date, note: 'Seeded test payment' },
  });
  await prisma.invoice.update({
    where: { id: inv.id },
    data: { amountPaid: amount, status: amount >= total ? 'PAID' : 'CONFIRMED' },
  });
}

console.log('Done. Login: admin@brightloop.com / staff@brightloop.com / customer1@example.com (Password: Password@123)');
await prisma.$disconnect();
process.exit(0);
