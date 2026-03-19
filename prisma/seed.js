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

  const clients = [
    {
      businessName: 'Client Business A',
      email: 'clienta@example.com',
      password: process.env.SEED_CLIENT_A_PASSWORD || 'ClientA1234!',
      clientCode: 'BIZ001',
      mobileNumber: '0241234567',
      mobileOperator: 'MTN',
      countryCode: 'GH',
      currency: 'GHS',
    },
    {
      businessName: 'Client Business B',
      email: 'clientb@example.com',
      password: process.env.SEED_CLIENT_B_PASSWORD || 'ClientB1234!',
      clientCode: 'BIZ002',
      mobileNumber: '0551234567',
      mobileOperator: 'TELECEL',
      countryCode: 'GH',
      currency: 'GHS',
    },
  ];

  for (const clientData of clients) {
    const passwordHash = await bcrypt.hash(clientData.password, SALT_ROUNDS);
    await prisma.client.upsert({
      where: { email: clientData.email },
      update: {},
      create: {
        businessName: clientData.businessName,
        email: clientData.email,
        passwordHash,
        clientCode: clientData.clientCode,
        mobileNumber: clientData.mobileNumber,
        mobileOperator: clientData.mobileOperator,
        countryCode: clientData.countryCode,
        currency: clientData.currency,
        feeRate: 0.02,
        isActive: true,
      },
    });
    console.log(`Seeded client: ${clientData.email} (${clientData.clientCode})`);
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
