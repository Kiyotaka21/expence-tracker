import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateTransactionDto,
  Transaction,
  TransactionList,
  TransactionListQuery,
  TransactionSummary,
  TransactionSummaryQuery,
  UpdateTransactionDto,
} from '@expence/contracts';

import { PrismaService } from '../../prisma/prisma.service';
import { toTransaction, toTransactionSummary } from './transaction.mapper';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: TransactionListQuery): Promise<TransactionList> {
    const where = {
      userId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items: rows.map(toTransaction), total, page: query.page, limit: query.limit };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!row) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return toTransaction(row);
  }

  /**
   * Сводка за месяц по одной валюте: складывать рубли с долларами нельзя,
   * курсов в проекте нет. Границы берём в UTC — в БД `timestamp(3)` без зоны,
   * и смешивание с локальным временем давало бы разные итоги на разных машинах.
   */
  async summary(userId: string, query: TransactionSummaryQuery): Promise<TransactionSummary> {
    const from = new Date(Date.UTC(query.year, query.month - 1, 1));
    const to = new Date(Date.UTC(query.year, query.month, 1));

    const where = {
      userId,
      currency: query.currency,
      occurredAt: { gte: from, lt: to },
    };

    const [byType, byCategory] = await Promise.all([
      this.prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    // groupBy не умеет include, поэтому категории добираем одним запросом
    // и раскладываем по id.
    const categoryIds = byCategory
      .map((row) => row.categoryId)
      .filter((id): id is string => id !== null);

    const categories =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({ where: { id: { in: categoryIds } } })
        : [];

    const categoryById = new Map(categories.map((category) => [category.id, category]));

    return toTransactionSummary({
      month: query.month,
      year: query.year,
      currency: query.currency,
      byType: byType.map((row) => ({ type: row.type, sum: row._sum.amount })),
      byCategory: byCategory.map((row) => ({
        type: row.type,
        sum: row._sum.amount,
        category: row.categoryId ? (categoryById.get(row.categoryId) ?? null) : null,
      })),
    });
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    await this.ensureCategoryOwned(userId, dto.categoryId);

    const row = await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        type: dto.type,
        currency: dto.currency,
        categoryId: dto.categoryId ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        note: dto.note ?? null,
      },
      include: { category: true },
    });

    return toTransaction(row);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.ensureOwned(userId, id);
    await this.ensureCategoryOwned(userId, dto.categoryId);

    const row = await this.prisma.transaction.update({
      where: { id },
      data: {
        amount: dto.amount,
        type: dto.type,
        currency: dto.currency,
        categoryId: dto.categoryId,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        note: dto.note,
      },
      include: { category: true },
    });

    return toTransaction(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Транзакция не найдена');
    }
  }

  /** Нельзя привязать транзакцию к чужой категории. */
  private async ensureCategoryOwned(
    userId: string,
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (!categoryId) return;

    const found = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });

    if (!found) {
      throw new BadRequestException('Категория не найдена');
    }
  }
}
