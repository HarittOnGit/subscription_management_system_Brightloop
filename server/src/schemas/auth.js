import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);

export const registerSchema = z.object({ name, email, password: passwordSchema });
export const createUserSchema = registerSchema; // staff/customer created by admin or staff
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(10, 'Invalid link'), password: passwordSchema });
