import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import meRoutes from './routes/me.js';
import productRoutes from './routes/products.js';
import planRoutes from './routes/plans.js';
import templateRoutes from './routes/templates.js';
import taxRoutes from './routes/taxes.js';
import discountRoutes from './routes/discounts.js';
import subscriptionRoutes from './routes/subscriptions.js';
import billingRoutes from './routes/billing.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import { startBillingCron } from './services/billingCron.js';

dotenv.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('[Warning] JWT_SECRET is not set in .env. Falling back to default for local development.');
  process.env.JWT_SECRET = 'brightloop-super-secret-jwt-key-2026';
}

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: 'ok',
      users: userCount,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database or query users',
      error: error.message,
    });
  }
});

/* ==========================================================================
   API ROUTE MOUNTING
   ========================================================================== */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/me', meRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Catch-all 404 for unhandled API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});

if (process.env.PORT !== '0') {
  app.listen(PORT, () => {
    console.log(`[Brightloop Server] Running on http://localhost:${PORT}`);
  });
  startBillingCron();
}

export default app;
