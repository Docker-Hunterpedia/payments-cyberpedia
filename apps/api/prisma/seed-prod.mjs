// Production seed: creates ONLY the first admin account, and only when the
// users table is empty. Never touches currencies, methods, or demo data —
// everything else is set up by the admin in the app.
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

try {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('[seed] users already exist — nothing to do');
  } else {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@cyberpedia.local';
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      throw new Error(
        'SEED_ADMIN_PASSWORD is required to create the first admin account',
      );
    }
    await prisma.user.create({
      data: {
        name: 'Admin',
        email,
        passwordHash: await argon2.hash(password),
        role: 'ADMIN',
      },
    });
    console.log(`[seed] created first admin account: ${email}`);
  }
} finally {
  await prisma.$disconnect();
}
