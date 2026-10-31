import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import taxRoutes from './routes/taxes.js';
import discountRoutes from './routes/discounts.js';
import productRoutes from './routes/products.js';
import planRoutes from './routes/plans.js';
import templateRoutes from './routes/templates.js';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
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
   ROUTE MOUNTING SECTION FOR TEAMMATES
   Mount all modular domain routers here as feature development progresses.
   Example:
     import authRoutes from './routes/auth.routes.js';
     import customerRoutes from './routes/customers.routes.js';
     import subscriptionRoutes from './routes/subscriptions.routes.js';
     import invoiceRoutes from './routes/invoices.routes.js';
     import paymentRoutes from './routes/payments.routes.js';
     import productRoutes from './routes/products.routes.js';
     import planRoutes from './routes/plans.routes.js';

     app.use('/api/auth', authRoutes);
     app.use('/api/customers', customerRoutes);
     app.use('/api/subscriptions', subscriptionRoutes);
     app.use('/api/products', productRoutes);
     app.use('/api/plans', planRoutes);
     app.use('/api/templates', templateRoutes);
     app.use('/api/invoices', invoiceRoutes);
     app.use('/api/payments', paymentRoutes);
     app.use('/api/products', productRoutes);
     app.use('/api/plans', planRoutes);
   ========================================================================== */

app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/templates', templateRoutes);

app.listen(PORT, () => {
  console.log(`[Brightloop Server] Running on http://localhost:${PORT}`);
});

export default app;
