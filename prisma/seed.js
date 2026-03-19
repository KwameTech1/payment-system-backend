'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = 12;

  const users = [
    {
      email: 'admin@payout.internal',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin1234!',
      fullName: 'Admin User',
    },
    {
      email: 'operator@payout.internal',
      password: process.env.SEED_OPERATOR_PASSWORD || 'Operator1234!',
      fullName: 'Operator User',
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        isActive: true,
      },
    });
    console.log(`Seeded user: ${userData.email}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
