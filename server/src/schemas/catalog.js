import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  type: z.string().trim().min(2, 'Type is required'),
  salesPrice: z.coerce.number().min(0, 'Sales price cannot be negative'),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative'),
  notes: z.string().optional().nullable(),
});

export const variantSchema = z.object({
  attribute: z.string().trim().min(1, 'Attribute is required'),
  value: z.string().trim().min(1, 'Value is required'),
  extraPrice: z.coerce.number().min(0).default(0),
});

const planFieldsSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  price: z.coerce.number().min(0),
  billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  minQuantity: z.coerce.number().int().min(1, 'Minimum quantity is 1'),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date(),
  autoClose: z.boolean().default(false),
  allowClose: z.boolean().default(false),
  allowPause: z.boolean().default(false),
  allowRenew: z.boolean().default(false),
});

export const planSchema = planFieldsSchema.refine(
  (data) => data.availableTo >= data.availableFrom,
  {
    message: 'End date must be after start date',
    path: ['availableTo'],
  }
);

export const planUpdateSchema = planFieldsSchema.partial().refine(
  (data) =>
    !data.availableFrom ||
    !data.availableTo ||
    data.availableTo >= data.availableFrom,
  {
    message: 'End date must be after start date',
    path: ['availableTo'],
  }
);

export const templateSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  planId: z.string().uuid('Pick a plan'),
  validityDays: z.coerce.number().int().min(1, 'At least 1 day'),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional().nullable(),
      quantity: z.coerce.number().int().min(1),
    })
  ).min(1, 'Add at least one product line'),
});

export const templateUpdateSchema = templateSchema.partial().refine(
  (data) => data.lines === undefined || data.lines.length > 0,
  {
    message: 'Add at least one product line',
    path: ['lines'],
  }
);
