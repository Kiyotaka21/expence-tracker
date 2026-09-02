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

/**
 * Бизнес-логика транзакций: CRUD и сводка за месяц.
 *
 * Каждый метод принимает `userId` первым аргументом и подмешивает его в `where`:
 * чужая запись неотличима от несуществующей, поэтому наружу уходит 404, а не 403.
 * Более тонких прав доступа в проекте нет.
 *
 * Наружу сущности отдаются в форме контракта `@expence/contracts` — приведением
 * занимаются мапперы из `transaction.mapper.ts`, а не Prisma.
 *
 * Ошибки самой Prisma здесь не перехватываются: их разбирает глобальный
 * `AllExceptionsFilter` (`P2002` → 409, `P2025` → 404, остальное → 500).
 */
@Injectable()
export class TransactionsService {
  /**
   * @param prisma - Клиент Prisma. `transactions` обращается к нему напрямую:
   * слоя репозитория у модуля нет, он есть только у `users`.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отдаёт страницу транзакций пользователя, свежие сверху, вместе с общим
   * количеством записей под текущие фильтры.
   *
   * Фильтры необязательные и комбинируются через «И», границы `from`/`to`
   * включительные (`gte`/`lte`).
   *
   * @param userId - Идентификатор владельца записей.
   * @param query - Пагинация (`page`, `limit`) и фильтры (`categoryId`, `type`, `from`, `to`);
   * умолчания уже проставлены схемой `transactionListQuerySchema`.
   * @returns Страница транзакций: `items`, `total`, `page`, `limit`.
   * @throws Своих исключений не бросает: пустая выборка — это пустой `items`, а не 404.
   * Наверх могут прорасти только ошибки Prisma (500).
   */
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

  /**
   * Отдаёт одну транзакцию пользователя вместе с её категорией.
   *
   * @param userId - Идентификатор владельца записи.
   * @param id - UUID транзакции.
   * @returns Транзакция в форме контракта.
   * @throws {NotFoundException} 404 «Транзакция не найдена» — записи нет либо она чужая.
   * Два этих случая намеренно не различаются: иначе по коду ответа можно было бы
   * перебором нащупать чужие id.
   */
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
   * Считает доходы, расходы, баланс и разбивку по категориям за календарный месяц.
   *
   * Сводка за месяц по одной валюте: складывать рубли с долларами нельзя,
   * курсов в проекте нет. Границы берём в UTC — в БД `timestamp(3)` без зоны,
   * и смешивание с локальным временем давало бы разные итоги на разных машинах.
   *
   * Категории добираются отдельным запросом: Prisma `groupBy` не умеет `include`.
   *
   * @param userId - Идентификатор владельца записей.
   * @param query - Месяц (1–12), год и валюта сводки.
   * @returns Сводка: `income`, `expense`, `balance` строками и разбивка `byCategory`.
   * @throws Своих исключений не бросает: месяц без транзакций даёт нули и пустой
   * `byCategory`. Наверх могут прорасти только ошибки Prisma (500).
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

  /**
   * Создаёт транзакцию пользователя.
   *
   * Умолчания `type` и `currency` проставляет схема `createTransactionSchema`;
   * здесь достраивается только то, что зависит от момента запроса: `occurredAt`
   * без значения — текущее время сервера.
   *
   * @param userId - Идентификатор владельца записи.
   * @param dto - Тело запроса: сумма, тип, валюта, категория, дата операции и заметка.
   * @returns Созданная транзакция в форме контракта.
   * @throws {BadRequestException} 400 «Категория не найдена» — `categoryId` указывает
   * на чужую или несуществующую категорию (см. `ensureCategoryOwned`).
   */
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

  /**
   * Частично обновляет транзакцию: непереданные поля (`undefined`) Prisma не трогает.
   *
   * `categoryId` и `note` при этом можно обнулить, передав `null`: схема
   * `updateTransactionSchema` допускает для них и `null`, и отсутствие поля.
   *
   * @param userId - Идентификатор владельца записи.
   * @param id - UUID транзакции.
   * @param dto - Изменяемые поля, каждое необязательно.
   * @returns Обновлённая транзакция в форме контракта.
   * @throws {NotFoundException} 404 «Транзакция не найдена» — записи нет либо она чужая.
   * @throws {BadRequestException} 400 «Категория не найдена» — новый `categoryId`
   * указывает на чужую или несуществующую категорию.
   */
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

  /**
   * Удаляет транзакцию пользователя. Удаление физическое, корзины в проекте нет.
   *
   * @param userId - Идентификатор владельца записи.
   * @param id - UUID транзакции.
   * @returns Ничего: контроллер отвечает 204 без тела.
   * @throws {NotFoundException} 404 «Транзакция не найдена» — записи нет либо она чужая.
   * Повторное удаление той же записи тоже даёт 404.
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Проверяет, что транзакция существует и принадлежит пользователю.
   *
   * Нужна там, где дальше идёт запрос по одному `id` (`update`, `delete`): сам по
   * себе такой запрос владельца не проверяет и правил бы чужую запись.
   *
   * @param userId - Идентификатор предполагаемого владельца.
   * @param id - UUID транзакции.
   * @returns Ничего: успех — это отсутствие исключения.
   * @throws {NotFoundException} 404 «Транзакция не найдена» — записи нет либо она чужая.
   */
  private async ensureOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Транзакция не найдена');
    }
  }

  /**
   * Нельзя привязать транзакцию к чужой категории.
   *
   * Пустое значение — это осознанное «без категории», поэтому проверка
   * пропускается: и `null`, и `undefined` валидны.
   *
   * @param userId - Идентификатор предполагаемого владельца категории.
   * @param categoryId - UUID категории, `null` (снять категорию) или `undefined` (не менять).
   * @returns Ничего: успех — это отсутствие исключения.
   * @throws {BadRequestException} 400 «Категория не найдена» — категории нет либо она чужая.
   * Здесь именно 400, а не 404: ненайденный ресурс запроса — сама транзакция,
   * а неверная категория — ошибка в теле запроса.
   */
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
