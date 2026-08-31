# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Монорепозиторий трекера расходов на pnpm workspaces + Turborepo:

- `apps/api` — Nest 11, REST + Swagger, Prisma 7, PostgreSQL. Порт 4000, глобальный префикс `/api`, Swagger на `/api/docs`.
- `apps/web` — Next 16 (App Router, Turbopack), Tailwind CSS v4, TanStack Query, shadcn/ui. Архитектура Feature-Sliced Design. Порт 3000.
- `packages/contracts` — zod-схемы и типы DTO, общие для обоих приложений.
- `packages/eslint-config`, `packages/tsconfig` — общие пресеты.

## Состояние репозитория

Рабочая заготовка. Зависимости установлены (`node_modules`, `pnpm-lock.yaml` на месте), применены три миграции Prisma (`init`, `user_last_login_at`, `expenses_to_transactions`), клиент сгенерирован в `apps/api/src/generated/prisma`. `pnpm typecheck`, `pnpm lint` и `pnpm build` проходят по всем пакетам. Аутентификация работает end-to-end: регистрация, вход, ротация refresh-токенов, отзыв сессий.

Фронтенд целиком переведён на Feature-Sliced Design и shadcn/ui (`radix-nova`). Страницы входа и регистрации собраны на `Field` + `react-hook-form` + контрактные схемы; остальные экраны (обзор, транзакции, категории) собраны в слоях.

Осознанно нет: тестов и тестового раннера, CI, git-репозитория. Бизнес-логика `categories` — CRUD-скелет. У `transactions` поверх CRUD есть сводка за месяц (`GET /api/transactions/summary`), других отчётов пока нет. В интерфейсе нет переключателя темы: тема следует настройке ОС.

Порядок запуска на чистой машине описан в [README.md](README.md).

## Команды

```bash
pnpm dev                  # web + api в watch (turbo, с учётом графа сборки)
pnpm build                # сборка всех пакетов
pnpm lint                 # eslint по всем пакетам
pnpm typecheck            # tsc --noEmit по всем пакетам
pnpm format               # prettier по репозиторию

pnpm --filter api dev     # только backend
pnpm --filter web dev     # только frontend
pnpm --filter @expence/contracts dev   # tsc --watch для контрактов

pnpm db:migrate           # prisma migrate dev в apps/api
pnpm db:generate          # генерация Prisma-клиента
pnpm db:seed              # сиды (демо-пользователь + категории)
pnpm db:studio            # Prisma Studio
docker compose up -d      # PostgreSQL 17

# новый компонент shadcn/ui (пишется в apps/web/src/shared/ui по components.json)
pnpm --filter web exec shadcn@latest add <component>
pnpm --filter web exec shadcn@latest docs <component>   # ссылки на документацию и примеры
```

Тестового раннера нет — если он понадобится, его нужно завести (решение «без тестов» на этапе заготовки было принято сознательно).

Флаги в скрипты пакета передавайте через `exec`, а не `run`: `pnpm --filter api exec prisma migrate dev --name init`.

## Архитектура: что нужно понять до правок

### Контракт API — единственный источник правды

Все DTO описаны zod-схемами в `packages/contracts`. Оттуда они расходятся в три места:

- Nest: `createZodDto(schema)` в `dto.ts` каждого модуля + глобальный `ZodValidationPipe` (`APP_PIPE` в `app.module.ts`) → валидация `@Body`/`@Query`/`@Param`.
- Swagger: схемы выводятся из тех же zod-описаний, `cleanupOpenApiDoc()` в `main.ts` приводит их к валидному OpenAPI.
- Next: формы через `zodResolver`.

Меняете форму запроса или ответа — правьте схему в `packages/contracts`, а не DTO в модуле.

### Contracts собирается в dist, и это влияет на порядок задач

Пакет компилируется `tsc` в CommonJS (`dist` + `.d.ts`), поэтому Nest и Next потребляют его без `transpilePackages`. Цена: правки в контрактах не видны приложениям до пересборки. Поэтому у `dev`, `build`, `lint` и `typecheck` в `turbo.json` стоит `dependsOn: ["^build"]`. При ручном запуске одного приложения держите рядом `pnpm --filter @expence/contracts dev`.

### Prisma 7 устроен не как 6.x

- Строка подключения — в `apps/api/prisma.config.ts` (`datasource.url`), в `schema.prisma` у `datasource` только `provider`.
- Генератор — `prisma-client` (не `prisma-client-js`), вывод в `apps/api/src/generated/prisma`, `moduleFormat = "cjs"` обязателен, т.к. Nest компилируется в CommonJS. Импорт: `from '../generated/prisma/client'`.
- **Driver adapter обязателен**: `new PrismaClient()` без него бросает ошибку. `PrismaService` передаёт `new PrismaPg({ connectionString })`.
- Сиды настраиваются через `migrations.seed` в `prisma.config.ts`, а не полем `prisma` в package.json.
- **Переименование модели Prisma разворачивает в `DROP` + `CREATE`** и теряет данные — он не умеет отличить переименование от «удалили одно, добавили другое». Если данные нужны, создавайте миграцию через `--create-only` и заменяйте SQL на `ALTER TABLE ... RENAME` вручную (образец — `expenses_to_transactions`). В непустой БД `migrate dev` к тому же спрашивает подтверждение, а в неинтерактивной среде просто падает: применяйте такую миграцию через `prisma migrate deploy`.
- **Флаги `migrate diff` в Prisma 7 переименованы**: `--from-schema-datamodel` → `--from-schema`, вместо `--to-url` — `--to-config-datasource`. Проверка дрейфа: `prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code`.
- **`prisma migrate dev` не генерирует клиент** — в отличие от Prisma 6.x. После миграции нужен отдельный `pnpm db:generate`. Порядок важен: `generate` без миграции научит клиент селектить колонку, которой нет в БД, и запросы к модели начнут падать в рантайме. Сначала миграция, потом генерация.
- Из-за того, что сгенерированный клиент компилируется как часть `src`, в `apps/api/tsconfig.json` выключен `noUncheckedIndexedAccess`. В остальных пакетах он включён.

### Аутентификация

Закрыто по умолчанию: `JwtAuthGuard` зарегистрирован глобально через `APP_GUARD`, открытые маршруты помечаются `@Public()`. Оба токена лежат в httpOnly cookie; refresh-cookie ограничена путём `/api/auth`, поэтому не ходит с обычными запросами.

Refresh делает ротацию: сессия в таблице `refresh_sessions` гасится и выдаётся новая пара. Повторное использование уже отозванного токена трактуется как утечка — гасятся **все** живые сессии пользователя (`AuthService.rotateTokens`).

`apps/web/src/proxy.ts` (в Next 16 middleware переименован в proxy — и файл, и имя функции) проверяет только наличие cookie, не валидность JWT: значение httpOnly недоступно. Cookie ставит API на порту 4000, но браузер не различает порты — на 3000 она видна.

Исходный путь proxy передаёт на страницу входа в `?from=`, форма возвращает пользователя туда после успеха. Значение приходит от пользователя, поэтому проходит через `safeInternalPath` (`shared/lib/redirect.ts`): всё, что не начинается с `/` — или начинается с `//` и `/\` — заменяется на дашборд, иначе получаем открытый редирект.

Формы входа и регистрации показывают текст ошибки от API как есть — 401 и 409 он отдаёт по-русски. Исключения переводит `sessionErrorMessage` (`entities/session/lib`): 429 приходит от `ThrottlerGuard` по-английски, а сорванный `fetch` — вообще не ответ сервера.

`User.lastLoginAt` пишется в одном месте — `AuthService.issueTokens`. Это единственный путь выдачи пары токенов, поэтому одна отметка там покрывает register, login и refresh. Транзакции с созданием refresh-сессии намеренно нет: поле телеметрическое, в контракт `authUserSchema` не входит и наружу не отдаётся.

### Слой репозитория есть только у users

`modules/users` — единственный модуль с разделением на репозиторий и сервис: `UsersRepository` инкапсулирует Prisma (и вместе с `PrismaService` это единственные места, импортирующие `src/generated/prisma`), `UsersService` — тонкий фасад над ним, наружу модуль экспортирует только сервис. В `categories`/`transactions` сервисы по-прежнему обращаются к `PrismaService` напрямую, и доступ к `refresh_sessions` из `AuthService` — тоже. Неоднородность осознанная, не недосмотр; если будете вводить репозитории дальше, ориентируйтесь на `users.repository.ts`.

Мапперы (`*.mapper.ts`) при этом остаются независимыми от Prisma: они принимают структурные `*Like`-интерфейсы, а не сгенерированные типы.

### Деньги

В БД `Decimal(12,2)`. Наружу отдаётся **строка** (`amount.toFixed(2)` в мапперах) — иначе по пути к клиенту появился бы float. На входе `z.coerce.number()` с ограничением двух знаков. Формы работают со строками из input-ов и превращают их в DTO через контрактную схему на submit.

Валидация ответов (`ZodSerializerInterceptor`) сознательно **не** включена: сервисы сами приводят сущности к форме контракта (`Date` → ISO-строка) в файлах `*.mapper.ts`. Если включите интерсептор, эти мапперы станут обязательными везде.

### apps/web: Feature-Sliced Design

Слои сверху вниз: `app` → `views` → `widgets` → `features` → `entities` → `shared`. Импортировать можно только вниз и только через публичный API среза.

Две адаптации под App Router:

- **`src/app` — одновременно роутер Next и слой `app` FSD.** `layout.tsx`/`page.tsx` остаются маршрутами, рядом лежат `providers.tsx` (TanStack Query, next-themes, Toaster) и `globals.css`. Отдельного каталога для слоя `app` нет.
- **Слой `pages` из FSD называется `views`.** Имя `pages` в Next зарезервировано за Pages Router, поэтому композиции экранов живут в `src/views/<slice>/ui/<slice>-page.tsx`, а `page.tsx` роутера — тонкая обёртка: `metadata` и рендер компонента из `views`.

Что где лежит:

| Слой       | Содержимое                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `views`    | `login`, `register`, `dashboard`, `transactions`, `categories`, `terms`, `privacy` — сборка экрана из фич и сущностей                     |
| `widgets`  | `app-header` — шапка приложения                                                                                                           |
| `features` | действия: `auth/{login,register,logout}`, `category/{category-form,delete-category}`, `transaction/{transaction-form,delete-transaction}` |
| `entities` | `session`, `category`, `transaction` — запросы к API, ключи кэша, хуки над `useQuery`, атомарный UI (`CategoryIcon`)                      |
| `shared`   | `api/client.ts` (fetch + refresh + `ApiError`), `config/{env,routes,session}`, `lib/{utils,format,redirect}`, `ui` (shadcn и обёртки)     |

Правила проверяет линтер — `no-restricted-imports` в `apps/web/eslint.config.mjs`:

- импорт вверх по слоям запрещён;
- импорт в соседний срез того же слоя запрещён — общий код опускается слоем ниже;
- `shared` — исключение: у него нет срезов, только сегменты, и они друг о друге знают (`shared/ui/field.tsx` импортирует `shared/ui/label.tsx`).

Правило смотрит на алиас `@/<слой>/...`, поэтому относительные импорты внутри среза его не задевают — так и задумано: внутри среза ходите относительными путями, наружу — через `index.ts`.

**Публичный API.** У каждого среза `views`/`widgets`/`features`/`entities` есть `index.ts`, и только он виден снаружи. `shared` импортируется по модулям (`@/shared/ui/button`, `@/shared/lib/format`) — барреля у него нет намеренно: так CLI shadcn пишет файлы в привычном ему виде, а proxy не тянет в свой бандл `env.ts`.

### apps/web: shadcn/ui

Компоненты живут не в зависимостях, а в коде: куда их писать, описано в `apps/web/components.json`. Стиль — `radix-nova` (Radix UI + lucide + Geist), база `neutral`, `primary`/`ring` переопределены на индиго прежней фирменной палитры в `globals.css`. Своего набора UI-примитивов (бывший `src/components/ui`) больше нет.

- **Алиасы в `components.json` указывают на слои FSD** (`ui` → `@/shared/ui`, `lib` → `@/shared/lib`, `utils` → `@/shared/lib/utils`). Меняете структуру — правьте и их, иначе `shadcn add` создаст `src/components/ui` и слои разъедутся.
- **Пакет `shadcn` нужен не только как CLI**: `globals.css` делает `@import 'shadcn/tailwind.css'` — оттуда keyframes и варианты `data-*`. Поэтому он в `dependencies`, а не в dev. Убрать можно только через `shadcn eject`, который встроит этот CSS в проект.
- **Компонента `form` в стиле `radix-nova` нет** — в реестре пустой элемент. Формы собираются из `field` и `Controller` из react-hook-form: `<Field data-invalid={fieldState.invalid}>`, `aria-invalid` на контроле, `<FieldError errors={[fieldState.error]} />`. Это официальный путь, ссылки на документацию даёт `shadcn docs field`.
- **`error-alert.tsx` и `password-input.tsx` в `shared/ui` — свои, не из реестра.** Первый — единая плашка ошибки запроса, второй — поле пароля на `InputGroup` (рамка и focus-ring охватывают кнопку-глаз, чего не даёт `Input` с абсолютным позиционированием). `shadcn add --overwrite` их не тронет: таких имён в реестре нет.
- **Тёмная тема включается классом `.dark`**, а не `prefers-color-scheme`: `@custom-variant dark (&:is(.dark *))`. Класс ставит `next-themes` с `defaultTheme="system"` в `src/app/providers.tsx`, поэтому `suppressHydrationWarning` на `<html>` обязателен. Сам `next-themes` пришёл вместе с `sonner` — переключателя темы в интерфейсе нет, тема следует ОС.
- **Шрифт Geist скачивается на этапе сборки** (`next/font/google` в `layout.tsx`) с подмножеством `cyrillic` — без него русский текст рисовался бы фолбэком. `next build` без сети упадёт.
- Иконки lucide помечены `"use client"`, так что в серверных компонентах их использовать можно — они просто становятся клиентской границей. Но **компонент, полученный из вызова функции внутри рендера, запрещает правило `react-hooks/static-components`**: в `entities/category` карта иконок экспортируется как `CATEGORY_ICON_COMPONENTS`, и нужный элемент выбирается индексацией, а не функцией-фабрикой.

### Границы, которые легко сломать

- **TypeScript закреплён на 5.9.3**, хотя в реестре есть 7.x: `typescript-eslint@8` объявляет `typescript: >=4.8.4 <6.1.0`. Bump TS — только вместе с мажором typescript-eslint.
- **`eslint-config-next` живёт только в `packages/eslint-config`**, и `next.mjs` намеренно не композитится с `base.mjs`: конфиг Next уже подключает typescript-eslint и react-hooks, а повторное определение того же плагина в flat-config — ошибка ESLint.
- **В `apps/api` нет path-алиасов**, только относительные импорты: `nest build`/`tsc` не переписывают `paths` в выходном JS. В `apps/web` алиас `@/*` есть и работает через бандлер.
- **ESLint закреплён на 9.39.5, поднимать до 10 нельзя.** `eslint-config-next@16` тянет `eslint-plugin-react@7.37`, который на ESLint 10 падает с `contextOrFilename.getFilename is not a function` — линт веба просто не запускается. npm помечает 9.x как deprecated, это ожидаемо; ждём совместимый `eslint-plugin-react`.
- `pnpm-workspace.yaml` содержит `onlyBuiltDependencies` — pnpm 10 иначе блокирует postinstall у `prisma`, `argon2`, `@tailwindcss/oxide`. Рядом `ignoredBuiltDependencies` с `@scarf/scarf` (телеметрия, пришла с `radix-ui`), иначе pnpm спрашивает про него на каждой установке.
- `next lint` в Next 16 удалён: скрипт `lint` вызывает `eslint .` напрямую.
- **`prettier-plugin-tailwindcss` нужен и в корневых devDependencies.** Конфиг с плагином лежит в `apps/web/.prettierrc.json`, но `pnpm format` запускается из корня, а плагины prettier резолвит от cwd, не от места конфига — без корневой зависимости команда падает на файлах веба.
- Версии зависимостей в репозитории закреплены точно, без `^`. CLI shadcn ставит их с кареткой — после `shadcn add` проверьте `apps/web/package.json`.
