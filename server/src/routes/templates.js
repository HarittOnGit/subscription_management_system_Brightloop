import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  templateSchema,
  templateUpdateSchema,
} from '../schemas/catalog.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

const templateInclude = {
  plan: true,
  lines: {
    include: { product: true, variant: true },
  },
};

function databaseError(res, error, action) {
  console.error(`${action} template error:`, error);
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Template not found' });
  }
  if (error.code === 'P2003' || error.code === 'P2014') {
    if (action === 'delete') {
      return res.status(409).json({ error: 'Cannot delete a template used by a subscription' });
    }
    return res.status(400).json({ error: 'The selected plan, product, or variant was not found' });
  }
  return res.status(500).json({ error: `Failed to ${action} template` });
}

async function validateLineVariants(lines) {
  const variantIds = [...new Set(lines.map((line) => line.variantId).filter(Boolean))];
  if (variantIds.length === 0) return true;

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true },
  });
  const variantProducts = new Map(variants.map((variant) => [variant.id, variant.productId]));

  return lines.every(
    (line) => !line.variantId || variantProducts.get(line.variantId) === line.productId
  );
}

router.get('/', staffOrAdmin, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const search = String(req.query.search ?? '').trim();

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Page must be positive and limit must be between 1 and 100' });
  }

  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  try {
    const [items, total] = await Promise.all([
      prisma.quotationTemplate.findMany({
        where,
        include: templateInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quotationTemplate.count({ where }),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  try {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id: req.params.id },
      include: templateInclude,
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json(template);
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.post('/', adminOnly, async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { lines, ...data } = parsed.data;
  try {
    if (!(await validateLineVariants(lines))) {
      return res.status(400).json({
        error: 'Each variant must belong to the product on its template line',
      });
    }

    const template = await prisma.quotationTemplate.create({
      data: { ...data, lines: { create: lines } },
      include: templateInclude,
    });
    return res.status(201).json(template);
  } catch (error) {
    return databaseError(res, error, 'create');
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  const parsed = templateUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const existing = await prisma.quotationTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const { lines, ...fields } = parsed.data;
    if (lines && !(await validateLineVariants(lines))) {
      return res.status(400).json({
        error: 'Each variant must belong to the product on its template line',
      });
    }

    const template = await prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx.quotationTemplate.update({
          where: { id: req.params.id },
          data: fields,
        });
      }

      if (lines) {
        await tx.templateLine.deleteMany({
          where: { templateId: req.params.id },
        });
        await tx.templateLine.createMany({
          data: lines.map((line) => ({
            ...line,
            templateId: req.params.id,
          })),
        });
      }

      return tx.quotationTemplate.findUnique({
        where: { id: req.params.id },
        include: templateInclude,
      });
    });
    return res.json(template);
  } catch (error) {
    return databaseError(res, error, 'update');
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.quotationTemplate.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    return databaseError(res, error, 'delete');
  }
});

export default router;
