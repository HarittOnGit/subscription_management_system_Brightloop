import { z } from 'zod';

export const paymentSchema = z.object({
  invoiceId: z.string().uuid('Pick an invoice'),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  amount: z.coerce.number().positive('Amount must be above 0'),
  date: z.coerce.date().refine((d) => d <= new Date(Date.now() + 86400000), 'Date cannot be in the future'),
  note: z.string().trim().max(500, 'Note is too long').optional().nullable(),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']),
});
