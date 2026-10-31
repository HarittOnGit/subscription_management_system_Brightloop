import { Router } from 'express';
import { prisma } from '../index.js';
import {
  discountSchema,
  discountUpdateSchema,
} from '../schemas/subscriptions.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const discounts = await prisma.discount.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(discounts);
  } catch (error) {
    console.error('Get discounts error:', error);
    return res.status(500).json({
      message: 'Failed to fetch discounts',
      error: error.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const discount = await prisma.discount.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    return res.json(discount);
  } catch (error) {
    console.error('Get discount error:', error);
    return res.status(500).json({
      message: 'Failed to fetch discount',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = discountSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid discount payload',
        errors: parsed.error.flatten(),
      });
    }

    const discount = await prisma.discount.create({
      data: parsed.data,
      include: { product: true },
    });

    return res.status(201).json(discount);
  } catch (error) {
    console.error('Create discount error:', error);
    return res.status(500).json({
      message: 'Failed to create discount',
      error: error.message,
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = discountUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid discount update payload',
        errors: parsed.error.flatten(),
      });
    }

    const existing = await prisma.discount.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    const completeDiscount = discountSchema.safeParse({
      ...existing,
      ...parsed.data,
    });

    if (!completeDiscount.success) {
      return res.status(400).json({
        message: 'Invalid discount update payload',
        errors: completeDiscount.error.flatten(),
      });
    }

    const updatedDiscount = await prisma.discount.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { product: true },
    });

    return res.json(updatedDiscount);
  } catch (error) {
    console.error('Update discount error:', error);
    return res.status(500).json({
      message: 'Failed to update discount',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.discount.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    const deletedDiscount = await prisma.discount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return res.json({
      message: 'Discount deactivated successfully',
      discount: deletedDiscount,
    });
  } catch (error) {
    console.error('Deactivate discount error:', error);
    return res.status(500).json({
      message: 'Failed to deactivate discount',
      error: error.message,
    });
  }
});

export default router;
