# Новая функциональность - модуль транзакций

## Контекст

Проект: Nest 11 + Next 16 + PostgreSQL 17 + Prisma 7, монорепо на pnpm workspaces  
Что уже есть: User, авторизация JWT (httpOnly cookie, ротация refresh),  
модули categories и expenses, фронтенд на Feature-Sliced Design,  
общие zod-контракты в packages/contracts

## Задача

Преврати модуль expenses в transactions — центральный модуль приложения для учёта
доходов и расходов.

Вторую модель рядом с Expense не заводи: она уже хранит сумму, дату, категорию,
заметку и пользователя — не хватает только типа операции. Отдельная модель
Transaction рядом с Expense — это две таблицы с одной семантикой и постоянный
вопрос, из какой строить отчёты.

Объём: переименование Expense → Transaction по всему стеку (Prisma, контракты,
модуль API, срезы фронтенда, маршрут) + новое поле type + агрегация за месяц.

## Модель данных

В apps/api/prisma/schema.prisma:

- добавь enum TransactionType { INCOME EXPENSE } с @@map("transaction_type")
- переименуй модель Expense → Transaction, @@map("expenses") → @@map("transactions")
- добавь поле type TransactionType @default(EXPENSE) — дефолт нужен, чтобы существующие строки мигрировали как расходы
- переименуй spentAt → occurredAt: «spent» больше не описывает доход
- остальные поля оставь как есть: amount Decimal @db.Decimal(12, 2), currency, note, categoryId (nullable, onDelete: SetNull), createdAt, updatedAt
- индексы: @@index([userId, occurredAt]), @@index([categoryId]), добавь @@index([userId, type])
- обратные связи в User и Category: expenses Expense[] → transactions Transaction[]

Переименование таблицы и колонки prisma migrate dev разворачивает в DROP + CREATE
и теряет данные. Открой созданный файл миграции и замени эту часть SQL на:

ALTER TABLE "expenses" RENAME TO "transactions";  
ALTER TABLE "transactions" RENAME COLUMN "spentAt" TO "occurredAt";

CREATE TYPE и ADD COLUMN "type" оставь как сгенерировано. Если данными в локальной
БД можно пожертвовать — правку можно пропустить и накатить миграцию как есть,
затем pnpm db:seed.

Команды (в Prisma 7 migrate dev клиент не генерирует, второй шаг обязателен):

pnpm --filter api exec prisma migrate dev --name expenses-to-transactions  
pnpm db:generate

## Контроллер

Модуль apps/api/src/modules/transactions (переименованный expenses),
@Controller('transactions') — глобальный префикс /api навешивается в main.ts.
JwtAuthGuard глобальный, пользователя бери через @CurrentUser(): все выборки
и правки только по нему.

Эндпоинты:

- POST /transactions: создать транзакцию
- GET /transactions: список с фильтрами. Сохрани существующие query-параметры from, to, categoryId и пагинацию из expenseListQuerySchema, добавь type. Отдельных dateFrom/dateTo не вводи — это те же from/to
- GET /transactions/summary: агрегация за месяц, query-параметры month и year (оба обязательные) — сумма доходов, сумма расходов, баланс и разбивка по категориям
- GET /transactions/:id: одна транзакция (сейчас такого эндпоинта в модуле нет, его нужно добавить)
- PATCH /transactions/:id: обновить
- DELETE /transactions/:id: удалить

Маршрут /transactions/summary объявляй ДО /transactions/:id — иначе :id перехватит summary.

## Паттерн

Backend: структуру не выдумывай, она уже есть в @apps/api/src/modules/expenses  
(controller + service + dto.ts + *.mapper.ts) — этот модуль ты и переименовываешь.  
Репозиторий выделяй только если это оговорено в задаче, по образцу  
@apps/api/src/modules/users.  
Frontend (FSD): @apps/web/src/entities/expense → entities/transaction,  
@apps/web/src/features/expense → features/transaction,  
@apps/web/src/views/expenses → views/transactions.  
Маршрут /expenses → /transactions в @apps/web/src/shared/config/routes.ts,  
пункт меню — в @apps/web/src/widgets/app-header.  
Импорты только вниз по слоям и только через index.ts среза.  
Контракт: @packages/contracts/src/expense.ts → transaction.ts, перевесить экспорт  
в packages/contracts/src/index.ts.

## Ограничения

- Не добавлять зависимости если не указано в задаче; версии фиксируй точно, без ^
- DTO описывай zod-схемой в packages/contracts и оборачивай через createZodDto —  
class-validator в проекте не используется
- Правки в контрактах не видны приложениям без пересборки: держи рядом  
pnpm --filter @expence/contracts dev
- Prisma: сначала pnpm db:migrate, потом pnpm db:generate — migrate dev клиент не генерирует
- Деньги в БД Decimal(12,2), наружу отдавай строкой через amount.toFixed(2) в маппере
- Старых имён expense/expenses после переименования остаться не должно — ни в коде, ни в маршрутах, ни в ключах кэша TanStack Query
- После реализации собирай проект: pnpm typecheck, pnpm lint, pnpm build
