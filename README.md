# Expence Tracker

Монорепозиторий трекера расходов.

| Пакет                                            | Что это                                                                   | Порт |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ---- |
| [apps/web](apps/web)                             | Next.js 16, App Router, Tailwind CSS v4, shadcn/ui, Feature-Sliced Design | 3000 |
| [apps/api](apps/api)                             | Nest.js 11, REST + Swagger, Prisma 7                                      | 4000 |
| [packages/contracts](packages/contracts)         | Общие zod-схемы и типы DTO                                                | —    |
| [packages/eslint-config](packages/eslint-config) | Общие flat-конфиги ESLint                                                 | —    |
| [packages/tsconfig](packages/tsconfig)           | Общие tsconfig-пресеты                                                    | —    |

## Требования

- Node.js >= 24 (проверено на 24.12)
- pnpm 10.33+ (`corepack enable && corepack use pnpm@10.33.0`)
- Docker (для локального PostgreSQL)
- Доступ в интернет при сборке веба: шрифт Geist подключён через `next/font/google` и скачивается на этапе сборки

## Первый запуск

```bash
# 1. Зависимости
pnpm install

# 2. Переменные окружения
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. База данных
docker compose up -d

# 4. Prisma: применить миграции, затем сгенерировать клиент.
#    Порядок важен, и это две отдельные команды: `migrate dev` клиент НЕ генерирует.
pnpm db:migrate
pnpm db:generate

# 5. (опционально) демо-данные
pnpm --filter api db:seed

# 6. Оба приложения в watch-режиме
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/health

## Скрипты

| Команда                        | Действие                                        |
| ------------------------------ | ----------------------------------------------- |
| `pnpm dev`                     | `web` и `api` в watch-режиме (через Turborepo)  |
| `pnpm build`                   | Сборка всех пакетов с учётом графа зависимостей |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` по всем пакетам         |
| `pnpm format`                  | Prettier по всему репозиторию                   |
| `pnpm db:migrate`              | `prisma migrate dev` в `apps/api`               |
| `pnpm db:generate`             | Генерация Prisma-клиента                        |
| `pnpm db:seed`                 | Сиды                                            |
| `pnpm db:studio`               | Prisma Studio                                   |

Точечный запуск: `pnpm --filter web dev`, `pnpm --filter api dev`.

## Архитектурные решения

- **Контракт API — один источник правды.** Все DTO описаны zod-схемами в `packages/contracts`.
  Nest валидирует запросы через `nestjs-zod` (`createZodDto` + глобальный `ZodValidationPipe`),
  Next использует те же схемы в формах через `@hookform/resolvers/zod`. Swagger-схемы
  выводятся из тех же zod-описаний.
- **Аутентификация.** Access- и refresh-токены выдаёт Nest, оба лежат в httpOnly cookie
  (refresh — с `path=/api/auth`). Пароли хешируются argon2id. Refresh-сессии хранятся в БД
  (`RefreshSession.tokenHash`) — это даёт ротацию и отзыв токенов.
- **Prisma 7.** URL подключения живёт в `apps/api/prisma.config.ts`, а не в `schema.prisma`.
  Клиент генерируется в `apps/api/src/generated/prisma` и требует driver adapter
  (`@prisma/adapter-pg`) — без него `new PrismaClient()` бросает ошибку.
- **Общий пакет контрактов собирается в `dist` (CommonJS + d.ts).** Так и Nest (CJS), и Next
  потребляют его без `transpilePackages` и хаков с `rootDir`. Поэтому у `dev`/`build`/`lint`
  в `turbo.json` стоит `dependsOn: ["^build"]`.
- **Фронтенд разложен по Feature-Sliced Design:** `app` → `views` → `widgets` → `features` →
  `entities` → `shared`. `src/app` служит и роутером Next, и слоем `app`; слой `pages` из FSD
  переименован в `views`, потому что имя `pages` в Next занято. Направление импортов проверяет
  ESLint (`apps/web/eslint.config.mjs`).
- **UI на shadcn/ui** (стиль `radix-nova`): компоненты лежат в `apps/web/src/shared/ui`,
  куда их пишет CLI по алиасам из `components.json`. Формы — `field` + `Controller`
  из react-hook-form с контрактными zod-схемами.

## Состояние проекта

Работает:

- зависимости установлены, `pnpm-lock.yaml` зафиксирован;
- две миграции применены (`init`, `user_last_login_at`), Prisma-клиент сгенерирован;
- `pnpm typecheck`, `pnpm lint` и `pnpm build` зелёные по всем пакетам;
- аутентификация end-to-end: регистрация, вход, `/auth/me`, ротация refresh-токенов
  с детекцией переиспользования, отзыв сессий;
- страницы входа и регистрации на shadcn/ui: валидация по контракту, показ/скрытие пароля,
  возврат на исходный путь после входа (`?from=`), тосты и текст ошибок от API.

Не сделано осознанно:

- бизнес-логика `categories`/`expenses` — CRUD-скелет, аналитики и отчётов пока нет;
- тесты, CI и git-репозиторий не заводились.
