import { Router } from 'express';
import { prisma } from '../index.js';
import { taxSchema } from '../schemas/subscriptions.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const taxes = await prisma.tax.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json(taxes);
  } catch (error) {
    console.error('Get taxes error:', error);
    return res.status(500).json({
      message: 'Failed to fetch taxes',
      error: error.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tax = await prisma.tax.findUnique({
      where: { id: req.params.id },
    });

    if (!tax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    return res.json(tax);
  } catch (error) {
    console.error('Get tax error:', error);
    return res.status(500).json({
      message: 'Failed to fetch tax',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = taxSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid tax payload',
        errors: parsed.error.flatten(),
      });
    }

    const tax = await prisma.tax.create({
      data: parsed.data,
    });

    return res.status(201).json(tax);
  } catch (error) {
    console.error('Create tax error:', error);
    return res.status(500).json({
      message: 'Failed to create tax',
      error: error.message,
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = taxSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid tax update payload',
        errors: parsed.error.flatten(),
      });
    }

    const existing = await prisma.tax.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    const updatedTax = await prisma.tax.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    return res.json(updatedTax);
  } catch (error) {
    console.error('Update tax error:', error);
    return res.status(500).json({
      message: 'Failed to update tax',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.tax.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    const deletedTax = await prisma.tax.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return res.json({
      message: 'Tax deactivated successfully',
      tax: deletedTax,
    });
  } catch (error) {
    console.error('Delete tax error:', error);
    return res.status(500).json({
      message: 'Failed to deactivate tax',
      error: error.message,
    });
  }
});

export default router;
