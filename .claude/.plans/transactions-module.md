# Модуль транзакций: Expense → Transaction

## Контекст

Трекер умеет учитывать только расходы. Задача из `.claude/prompts/feature.md` — научить его доходам и дать сводку за месяц.

Вторую модель рядом с `Expense` не заводим: она уже хранит сумму, дату, категорию, заметку и пользователя — не хватает только типа операции. Отдельная `Transaction` означала бы две таблицы с одной семантикой и постоянный вопрос, из какой строить отчёты. Поэтому `Expense` переименовывается в `Transaction` по всему стеку и получает поле `type`.

Решения, подтверждённые пользователем:

- `/transactions/summary` считает **одну валюту** — query-параметр `currency` с умолчанием `RUB`.
- Фронтенд делается **полностью**: переименование срезов плюс UI выбора типа и дашборд на сводке.
- Данные в таблице **сохраняются** — миграция правится вручную на `ALTER TABLE ... RENAME`.

Радиус: 20 файлов в четырёх пакетах. Тестового раннера в репозитории нет, проверка — сборка плюс ручной сценарий.

---

## 1. Контракты — `packages/contracts`

Переименовать `src/expense.ts` → `src/transaction.ts`, поправить реэкспорт в `src/index.ts`.

Переиспользовать из `src/common.ts` без изменений: `amountInputSchema`, `amountOutputSchema` (его regex `/^-?\d+(\.\d{1,2})?$/` уже допускает минус — нужен для баланса), `currencySchema`, `paginationQuerySchema`, `paginated`, `idParamSchema`.

Что меняется в схемах:

- новый `transactionTypeSchema = z.enum(['INCOME', 'EXPENSE'])` + константа `TRANSACTION_TYPES` (по образцу `CURRENCIES`);
- `createExpenseSchema` → `createTransactionSchema`: добавить `type: transactionTypeSchema.default('EXPENSE')` (умолчание — как у `currency.default('RUB')`, оно же совпадает с дефолтом колонки), `spentAt` → `occurredAt`;
- `expenseListQuerySchema` → `transactionListQuerySchema`: `from`/`to`/`categoryId`/пагинацию оставить как есть, добавить `type: transactionTypeSchema.optional()`. **Отдельных `dateFrom`/`dateTo` не вводить** — это те же `from`/`to`;
- `expenseSchema` → `transactionSchema`: добавить `type`, `spentAt` → `occurredAt`.

Новое для сводки:

```ts
export const transactionSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  currency: currencySchema.default('RUB'),
});

export const transactionSummarySchema = z.object({
  month: z.number().int(),
  year: z.number().int(),
  currency: currencySchema,
  income: amountOutputSchema,
  expense: amountOutputSchema,
  balance: amountOutputSchema,
  byCategory: z.array(
    z.object({
      category: categorySchema.nullable(),
      type: transactionTypeSchema,
      total: amountOutputSchema,
    }),
  ),
});
```

`month`/`year` обязательны — умолчаний не давать. `z.coerce`, потому что query приходит строками.

> Контракты компилируются в `dist`, приложения видят правки только после пересборки. Держать рядом `pnpm --filter @expence/contracts dev` либо собрать пакет перед typecheck.

---

## 2. Схема и миграция — `apps/api/prisma`

В `schema.prisma`:

- `enum TransactionType { INCOME EXPENSE }` с `@@map("transaction_type")`;
- `model Expense` → `model Transaction`, `@@map("expenses")` → `@@map("transactions")`;
- добавить `type TransactionType @default(EXPENSE)` — умолчание нужно, чтобы существующие строки мигрировали как расходы;
- `spentAt` → `occurredAt` (слово «spent» перестаёт описывать доход);
- остальные поля не трогать: `amount Decimal @db.Decimal(12, 2)`, `currency`, `note`, `categoryId` (nullable, `onDelete: SetNull`), `createdAt`, `updatedAt`;
- индексы: `@@index([userId, occurredAt])`, `@@index([categoryId])`, новый `@@index([userId, type])`;
- обратные связи: `User.expenses` и `Category.expenses` → `transactions Transaction[]`.

**Миграцию создать без применения**, иначе Prisma развернёт переименование в `DROP` + `CREATE` и потеряет строки:

```bash
pnpm --filter api exec prisma migrate dev --create-only --name expenses-to-transactions
```

В созданном файле заменить сгенерированный DDL на переименования. Имена ограничений и индексов взяты из `apps/api/prisma/migrations/20260825110237_init/migration.sql`:

```sql
ALTER TABLE "expenses" RENAME TO "transactions";
ALTER TABLE "transactions" RENAME COLUMN "spentAt" TO "occurredAt";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_pkey" TO "transactions_pkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_userId_fkey" TO "transactions_userId_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_categoryId_fkey" TO "transactions_categoryId_fkey";
ALTER INDEX "expenses_userId_spentAt_idx" RENAME TO "transactions_userId_occurredAt_idx";
ALTER INDEX "expenses_categoryId_idx" RENAME TO "transactions_categoryId_idx";

CREATE TYPE "transaction_type" AS ENUM ('INCOME', 'EXPENSE');
ALTER TABLE "transactions" ADD COLUMN "type" "transaction_type" NOT NULL DEFAULT 'EXPENSE';
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");
```

Затем применить и **обязательно** сгенерировать клиент — в Prisma 7 `migrate dev` этого не делает:

```bash
pnpm --filter api exec prisma migrate dev
pnpm db:generate
```

Контроль дрейфа: повторный `prisma migrate dev` должен сообщить, что изменений нет.

`prisma/seed.ts` расходов не создаёт — правки не требует.

---

## 3. Модуль API — `apps/api/src/modules/expenses` → `transactions`

Переименовать каталог и файлы: `transactions.controller.ts`, `transactions.service.ts`, `transactions.module.ts`, `transaction.mapper.ts`, `dto.ts`. В `app.module.ts` заменить `ExpensesModule` на `TransactionsModule`.

**`dto.ts`** — обернуть новые схемы через `createZodDto`, добавить `TransactionSummaryQueryDto` и `TransactionSummaryResponseDto`.

**`transaction.mapper.ts`** — сохранить принцип: маппер не знает про Prisma, работает со структурным `DecimalLike`. Переименовать `ExpenseLike` → `TransactionLike`, добавить `type` и `occurredAt`. Добавить `toTransactionSummary`.

Баланс считать без float — в копейках, диапазон безопасен (максимум `9 999 999 999.99` → 999 999 999 999 копеек, это меньше `Number.MAX_SAFE_INTEGER`):

```ts
const toKopecks = (value: DecimalLike | null): number =>
  Math.round(Number(value?.toFixed(2) ?? '0') * 100);
const fromKopecks = (value: number): string => (value / 100).toFixed(2);
```

**`transactions.service.ts`** — `this.prisma.expense` → `this.prisma.transaction`, `spentAt` → `occurredAt` в `where`/`orderBy`/`data`, в `list` добавить фильтр по `type`, в `create`/`update` пробрасывать `type`. Текст ошибки `'Расход не найден'` → `'Транзакция не найдена'`. Приватные `ensureOwned` и `ensureCategoryOwned` переиспользовать как есть.

Новый `findOne(userId, id)` — вернуть одну запись с `include: { category: true }`, через тот же `ensureOwned`.

Новый `summary(userId, query)`:

```ts
const from = new Date(Date.UTC(query.year, query.month - 1, 1));
const to = new Date(Date.UTC(query.year, query.month, 1));
const where = { userId, currency: query.currency, occurredAt: { gte: from, lt: to } };

const [byType, byCategory] = await Promise.all([
  this.prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
  this.prisma.transaction.groupBy({ by: ['categoryId', 'type'], where, _sum: { amount: true } }),
]);
```

`groupBy` не умеет `include`, поэтому названия категорий добрать одним `category.findMany({ where: { id: { in: ids } } })` и разложить по id. Границы месяца в UTC — в БД `TIMESTAMP(3)` без зоны, смешивать с локальной было бы источником расхождений.

**`transactions.controller.ts`** — `@Controller('transactions')` (префикс `/api` вешает `main.ts`), `@ApiTags('transactions')`. Эндпоинты: `POST /`, `GET /`, `GET /summary`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

> `GET /summary` объявить **до** `GET /:id` — иначе `:id` перехватит `summary`.

---

## 4. Фронтенд — `apps/web`

Переименование срезов (публичный API каждого — только `index.ts`):

| Было | Стало |
| --- | --- |
| `entities/expense` | `entities/transaction` |
| `features/expense/expense-form` | `features/transaction/transaction-form` |
| `features/expense/delete-expense` | `features/transaction/delete-transaction` |
| `views/expenses` | `views/transactions` |
| `app/(dashboard)/expenses/page.tsx` | `app/(dashboard)/transactions/page.tsx` |

- `shared/config/routes.ts`: `expenses: '/expenses'` → `transactions: '/transactions'`.
- `widgets/app-header`: пункт меню на `ROUTES.transactions`, подпись «Транзакции».
- `entities/transaction/api/transaction-api.ts`: `transactionApi` (добавить `get`, `update` через существующий `api.patch`, `summary`), `transactionKeys` с корнем `['transactions']` и ключом `summary(query)`.
- `entities/transaction/model/`: `use-transactions.ts` плюс новый `use-transaction-summary.ts`.
- `features/category/category-form` и `features/category/delete-category` импортируют `expenseKeys` — заменить на `transactionKeys`. Импорт `features/*` → `entities/*` идёт вниз по слоям, правило линтера не нарушается.

UI:

- **Форма** (`transaction-form.tsx`): добавить выбор типа — `NativeSelect` рядом с валютой, по образцу существующего поля `currency`; `spentAt` → `occurredAt`; подпись кнопки «Добавить», тост «Транзакция добавлена». Схема формы остаётся строковой, DTO собирается через `createTransactionSchema.safeParse` на submit — этот приём не менять.
- **Список** (`transactions-page.tsx`): колонка типа либо знак и цвет у суммы (`text-destructive` для расхода, зелёный для дохода), заголовок «Транзакции».
- **Дашборд** (`views/dashboard`): перевести на `useTransactionSummary` за текущий месяц. Карточки «Доходы», «Расходы», «Баланс» вместо нынешних. Клиентский `reduce` по `Number(item.amount)` убрать — арифметика по деньгам уезжает на сервер, как и предписывает CLAUDE.md. `formatMoney` из `shared/lib/format` переиспользовать.

---

## 5. Проверка

```bash
pnpm --filter @expence/contracts build
pnpm typecheck && pnpm lint && pnpm build
pnpm --filter api exec prisma migrate status
```

Не должно остаться старых имён (слово `expense` с `s` не пересекается с названием проекта `expence`):

```bash
grep -rn "expense\|Expense\|spentAt" apps packages --include=*.ts --include=*.tsx --include=*.prisma \
  | grep -v node_modules | grep -v src/generated
```

Ручной сценарий на живом стенде (`docker compose up -d`, `pnpm dev`):

1. Вход как `demo@expence.local` / `demo12345`.
2. Swagger `http://localhost:4000/api/docs` — тег `transactions`, шесть эндпоинтов, у `summary` параметры `month`, `year`, `currency`.
3. Создать доход и расход в одном месяце → список показывает знак и цвет, суммы приходят строками.
4. `GET /api/transactions?type=INCOME` возвращает только доходы; `GET /api/transactions/summary?month=<текущий>&year=<текущий>` — `income`, `expense`, `balance` (баланс отрицательный, если расходов больше) и разбивку по категориям.
5. Дашборд показывает те же три числа.
6. Удалить категорию → транзакции остаются с `category: null` (`onDelete: SetNull` сохранён).
7. Проверить, что старые строки расходов на месте и получили `type: EXPENSE`.
