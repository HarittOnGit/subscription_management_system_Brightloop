import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { productSchema, variantSchema } from '../schemas/catalog.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];

function databaseError(res, error, action) {
  console.error(`${action} product error:`, error);

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Cannot delete: product or variant is used in a template or subscription',
    });
  }
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Product or variant not found' });
  }
  return res.status(500).json({ error: `Failed to ${action} product` });
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
      prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.get('/:id', staffOrAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  } catch (error) {
    return databaseError(res, error, 'fetch');
  }
});

router.post('/', adminOnly, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    return res.status(201).json(await prisma.product.create({ data: parsed.data }));
  } catch (error) {
    return databaseError(res, error, 'create');
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    return res.json(await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
    }));
  } catch (error) {
    return databaseError(res, error, 'update');
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    return databaseError(res, error, 'delete');
  }
});

router.post('/:id/variants', adminOnly, async (req, res) => {
  const parsed = variantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const variant = await prisma.productVariant.create({
      data: { ...parsed.data, productId: req.params.id },
    });
    return res.status(201).json(variant);
  } catch (error) {
    return databaseError(res, error, 'create variant for');
  }
});

router.delete('/variants/:variantId', adminOnly, async (req, res) => {
  try {
    await prisma.productVariant.delete({ where: { id: req.params.variantId } });
    return res.json({ ok: true });
  } catch (error) {
    return databaseError(res, error, 'delete variant for');
  }
});

export default router;
