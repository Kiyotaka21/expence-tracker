# Новая функциональность

## Контекст
Проект: Nest.js + Next + PostgreSQL + Prisma
Что уже есть: User, авторизация JWT, модуль категорий + frontend авторизации

## Задача
[]

## Модель данных
[]

## Контроллер
[]

## Паттерн
Backend: @apps/api/src/modules/categories — образец структуры модуля
(controller + service + dto.ts + *.mapper.ts). Репозиторий выделяй только если
это оговорено в задаче, по образцу @apps/api/src/modules/users.
Frontend (FSD): сущность — @apps/web/src/entities/category, действия над ней —
@apps/web/src/features/category, экран — @apps/web/src/views/categories.
Импорты только вниз по слоям и только через index.ts среза.
Контракт: @packages/contracts/src/category.ts

## Ограничения
- Не добавлять зависимости если не указано в задаче; версии фиксируй точно, без ^
- DTO описывай zod-схемой в packages/contracts и оборачивай через createZodDto —
  class-validator в проекте не используется
- Правки в контрактах не видны приложениям без пересборки: держи рядом
  pnpm --filter @expence/contracts dev
- Prisma: сначала pnpm db:migrate, потом pnpm db:generate — migrate dev клиент не генерирует
- Деньги в БД Decimal(12,2), наружу отдавай строкой через amount.toFixed(2) в маппере
- После реализации собирай проект: pnpm typecheck, pnpm lint, pnpm build
