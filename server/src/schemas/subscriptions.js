import { z } from 'zod';

// empty string / null -> null, otherwise a number (z.coerce would turn null into 0)
const optNum = (min = 0) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(min).nullable().optional());

export const taxSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  percentage: z.coerce.number().min(0, 'Min 0').max(100, 'Max 100'),
});

export const discountSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required'),
    type: z.enum(['FIXED', 'PERCENT']),
    value: z.coerce.number().positive('Value must be above 0'),
    minPurchase: optNum(0),
    minQuantity: optNum(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    usageLimit: optNum(1),
    appliesTo: z.enum(['PRODUCT', 'SUBSCRIPTION']),
    productId: z.string().uuid().optional().nullable(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: 'End date must be after start date', path: ['endDate'] })
  .refine((d) => d.type !== 'PERCENT' || d.value <= 100, { message: 'Percentage cannot be over 100', path: ['value'] })
  .refine((d) => d.appliesTo !== 'PRODUCT' || d.productId, { message: 'Pick a product', path: ['productId'] });

export const subscriptionSchema = z
  .object({
    customerId: z.string().uuid('Pick a customer'),
    planId: z.string().uuid('Pick a plan'),
    startDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    paymentTerms: z.enum(['IMMEDIATE', 'NET_15', 'NET_30', 'NET_60']),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid().optional().nullable(),
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
          taxId: z.string().uuid().optional().nullable(),
          unitPrice: optNum(0).optional(),
        })
      )
      .min(1, 'Add at least one line'),
  })
  .refine((d) => d.expiryDate > d.startDate, { message: 'Expiry must be after start date', path: ['expiryDate'] });
