import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash('Password@123', 10);

await prisma.user.upsert({
  where: { email: 'admin@brightloop.com' },
  update: { passwordHash, role: 'ADMIN' },
  create: {
    email: 'admin@brightloop.com',
    name: 'Admin',
    passwordHash,
    role: 'ADMIN',
  },
});

console.log('Admin ready: admin@brightloop.com / Password@123');
await prisma.$disconnect();
