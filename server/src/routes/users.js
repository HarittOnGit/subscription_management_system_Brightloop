import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createUserSchema } from '../schemas/auth.js';

const router = Router();
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];
const select = { id: true, name: true, email: true, role: true, createdAt: true };

// LIST: GET /api/users?role=CUSTOMER|STAFF&search=&page=&limit=
router.get('/', staffOrAdmin, async (req, res) => {
  const role = (req.query.role || 'CUSTOMER').toString();
  if (!['CUSTOMER', 'STAFF'].includes(role)) return res.status(400).json({ error: 'Invalid role filter' });
  if (role === 'STAFF' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'You do not have access to this' });

  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 200);
  const search = req.query.search?.toString().trim();
  const where = {
    role,
    ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.user.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

async function createWithRole(role, req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password } = parsed.data;
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10), role },
      select,
    });
    res.status(201).json(user);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'An account with this email already exists' });
    throw e;
  }
}

// staff can add customers (day-to-day work), ONLY the admin can add staff
router.post('/customers', staffOrAdmin, (req, res) => createWithRole('CUSTOMER', req, res));
router.post('/staff', adminOnly, (req, res) => createWithRole('STAFF', req, res));

router.delete('/staff/:id', adminOnly, async (req, res) => {
  const target = await prisma.user.findFirst({ where: { id: req.params.id, role: 'STAFF' } });
  if (!target) return res.status(404).json({ error: 'Staff member not found' });
  try {
    await prisma.user.delete({ where: { id: target.id } });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Cannot delete: this person has related records' });
  }
});

export default router;
