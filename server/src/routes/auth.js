import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema, forgotSchema, resetSchema } from '../schemas/auth.js';
import { sendResetEmail } from '../services/mailer.js';

const router = Router();
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
const firstError = (parsed) => parsed.error.issues[0].message;

// SIGN UP: always creates a CUSTOMER, whatever the body says
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) });
  const { name, email, password } = parsed.data;
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: 'CUSTOMER' },
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'An account with this email already exists' });
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' }); // same error for both
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

// FORGOT PASSWORD: always answers the same, so nobody can discover which emails exist
router.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashToken(token), resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password?token=${token}`);
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) });
  const { token, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { resetToken: hashToken(token), resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), resetToken: null, resetTokenExpiry: null },
  });
  res.json({ message: 'Password updated. You can log in now.' });
});

export default router;
