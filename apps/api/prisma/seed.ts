import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

import { PrismaClient } from '../src/generated/prisma/client';

const DEMO_EMAIL = 'demo@expence.local';
const DEMO_PASSWORD = 'demo12345';

const DEFAULT_CATEGORIES = [
  { name: 'Продукты', color: '#16a34a', icon: 'shopping-cart' },
  { name: 'Транспорт', color: '#2563eb', icon: 'bus' },
  { name: 'Жильё', color: '#7c3aed', icon: 'home' },
  { name: 'Развлечения', color: '#db2777', icon: 'ticket' },
  { name: 'Здоровье', color: '#dc2626', icon: 'heart-pulse' },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL не задан — скопируйте .env.example в .env');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const user = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        name: 'Demo',
        passwordHash: await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id }),
      },
    });

    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: category.name } },
        update: {},
        create: { ...category, userId: user.id },
      });
    }

    console.log(`Сиды применены. Демо-логин: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
