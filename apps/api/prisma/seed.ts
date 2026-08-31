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

interface DemoTransaction {
  /** Имя категории из DEFAULT_CATEGORIES; null — операция без категории. */
  category: string | null;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  /** День месяца. Месяц подставляется при вставке. */
  day: number;
  note: string;
}

/**
 * Демо-операции за месяц. Их больше страницы списка (10), поэтому на главном
 * экране сразу видно пагинацию, а сводка за месяц не пустая.
 */
const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { category: null, amount: 145000, type: 'INCOME', day: 5, note: 'Зарплата' },
  { category: null, amount: 12000, type: 'INCOME', day: 18, note: 'Подработка' },
  { category: 'Жильё', amount: 42000, type: 'EXPENSE', day: 6, note: 'Аренда' },
  { category: 'Жильё', amount: 3850.4, type: 'EXPENSE', day: 7, note: 'Коммунальные' },
  { category: 'Продукты', amount: 2340.9, type: 'EXPENSE', day: 2, note: 'Супермаркет' },
  { category: 'Продукты', amount: 1180.5, type: 'EXPENSE', day: 9, note: 'Рынок' },
  { category: 'Продукты', amount: 3120, type: 'EXPENSE', day: 16, note: 'Закупка на неделю' },
  { category: 'Продукты', amount: 890.3, type: 'EXPENSE', day: 24, note: 'Пекарня' },
  { category: 'Транспорт', amount: 2500, type: 'EXPENSE', day: 3, note: 'Проездной' },
  { category: 'Транспорт', amount: 760, type: 'EXPENSE', day: 21, note: 'Такси' },
  { category: 'Развлечения', amount: 1600, type: 'EXPENSE', day: 12, note: 'Кино' },
  { category: 'Развлечения', amount: 4300, type: 'EXPENSE', day: 26, note: 'Концерт' },
  { category: 'Здоровье', amount: 5400, type: 'EXPENSE', day: 14, note: 'Стоматолог' },
];

/** За прошлый месяц набор короче — так сводки двух месяцев отличаются. */
const PREVIOUS_MONTH_COUNT = 10;

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

    /*
     * У транзакции нет естественного уникального ключа, поэтому upsert к ней не
     * применить: повторный `pnpm db:seed` просто наплодил бы дубли. Вставляем
     * только в пустой список — свои записи демо-пользователя останутся целы.
     */
    const existing = await prisma.transaction.count({ where: { userId: user.id } });

    if (existing === 0) {
      const categories = await prisma.category.findMany({ where: { userId: user.id } });
      const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));
      const now = new Date();

      const rows = [0, 1].flatMap((monthsAgo) =>
        (monthsAgo === 0
          ? DEMO_TRANSACTIONS
          : DEMO_TRANSACTIONS.slice(0, PREVIOUS_MONTH_COUNT)
        ).map((transaction) => ({
          userId: user.id,
          categoryId: transaction.category
            ? (categoryIdByName.get(transaction.category) ?? null)
            : null,
          amount: transaction.amount,
          type: transaction.type,
          currency: 'RUB',
          // Полдень UTC: в БД `timestamp(3)` без зоны, и края суток при
          // пересчёте в локальное время уехали бы в соседний день.
          occurredAt: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, transaction.day, 12),
          ),
          note: transaction.note,
        })),
      );

      await prisma.transaction.createMany({ data: rows });
      console.log(`Добавлено демо-операций: ${rows.length}`);
    } else {
      console.log(`Транзакции демо-пользователя уже есть (${existing}), новые не добавляем`);
    }

    console.log(`Сиды применены. Демо-логин: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
