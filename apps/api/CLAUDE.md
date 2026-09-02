# apps/api

Nest 11, REST + Swagger, Prisma 7, PostgreSQL. Порт 4000, глобальный префикс `/api`, Swagger на `/api/docs`.

Общее для всего репозитория — ветки, коммиты, pull request, контракты в `packages/contracts` — в корневом [CLAUDE.md](../../CLAUDE.md). Здесь только то, что нужно при правках бэкенда.

## Состояние

Применены три миграции Prisma (`init`, `user_last_login_at`, `expenses_to_transactions`), клиент сгенерирован в `apps/api/src/generated/prisma`. Аутентификация работает end-to-end: регистрация, вход, ротация refresh-токенов, отзыв сессий.

Бизнес-логика `categories` — CRUD-скелет. У `transactions` поверх CRUD есть сводка за месяц (`GET /api/transactions/summary`), других отчётов пока нет. Тестов и тестового раннера нет — решение осознанное; понадобится раннер — его нужно завести.

## Команды

```bash
pnpm --filter api dev     # nest start --watch (рядом держите pnpm --filter @expence/contracts dev)

pnpm db:migrate           # prisma migrate dev в apps/api
pnpm db:generate          # генерация Prisma-клиента
pnpm db:seed              # сиды (демо-пользователь + категории)
pnpm db:studio            # Prisma Studio
docker compose up -d      # PostgreSQL 17
```

Флаги в скрипты пакета передавайте через `exec`, а не `run`: `pnpm --filter api exec prisma migrate dev --name init`.

## Prisma 7 устроен не как 6.x

- Строка подключения — в `apps/api/prisma.config.ts` (`datasource.url`), в `schema.prisma` у `datasource` только `provider`.
- Генератор — `prisma-client` (не `prisma-client-js`), вывод в `apps/api/src/generated/prisma`, `moduleFormat = "cjs"` обязателен, т.к. Nest компилируется в CommonJS. Импорт: `from '../generated/prisma/client'`.
- **Driver adapter обязателен**: `new PrismaClient()` без него бросает ошибку. `PrismaService` передаёт `new PrismaPg({ connectionString })`.
- Сиды настраиваются через `migrations.seed` в `prisma.config.ts`, а не полем `prisma` в package.json.
- **Переименование модели Prisma разворачивает в `DROP` + `CREATE`** и теряет данные — он не умеет отличить переименование от «удалили одно, добавили другое». Если данные нужны, создавайте миграцию через `--create-only` и заменяйте SQL на `ALTER TABLE ... RENAME` вручную (образец — `expenses_to_transactions`). В непустой БД `migrate dev` к тому же спрашивает подтверждение, а в неинтерактивной среде просто падает: применяйте такую миграцию через `prisma migrate deploy`.
- **Флаги `migrate diff` в Prisma 7 переименованы**: `--from-schema-datamodel` → `--from-schema`, вместо `--to-url` — `--to-config-datasource`. Проверка дрейфа: `prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code`.
- **`prisma migrate dev` не генерирует клиент** — в отличие от Prisma 6.x. После миграции нужен отдельный `pnpm db:generate`. Порядок важен: `generate` без миграции научит клиент селектить колонку, которой нет в БД, и запросы к модели начнут падать в рантайме. Сначала миграция, потом генерация.
- Из-за того, что сгенерированный клиент компилируется как часть `src`, в `apps/api/tsconfig.json` выключен `noUncheckedIndexedAccess`. В остальных пакетах он включён.

## Валидация запросов и Swagger

DTO не пишутся руками: `createZodDto(schema)` в `dto.ts` каждого модуля оборачивает схему из `packages/contracts` (общая картина — раздел «Контракт API» в корневом CLAUDE.md), глобальный `ZodValidationPipe` (`APP_PIPE` в `app.module.ts`) проверяет по ней `@Body`/`@Query`/`@Param`, а Swagger выводит из тех же описаний схемы, которые `cleanupOpenApiDoc()` в `main.ts` приводит к валидному OpenAPI. Меняете форму запроса или ответа — правьте схему в контрактах, а не DTO в модуле.

**Валидация ответов (`ZodSerializerInterceptor`) сознательно не включена**: сервисы сами приводят сущности к форме контракта (`Date` → ISO-строка) в файлах `*.mapper.ts`. Если включите интерсептор, эти мапперы станут обязательными везде.

## Аутентификация

Закрыто по умолчанию: `JwtAuthGuard` зарегистрирован глобально через `APP_GUARD`, открытые маршруты помечаются `@Public()`. Оба токена лежат в httpOnly cookie (`modules/auth/cookies.ts`); refresh-cookie ограничена путём `/api/auth`, поэтому не ходит с обычными запросами.

Refresh делает ротацию: сессия в таблице `refresh_sessions` гасится и выдаётся новая пара. Повторное использование уже отозванного токена трактуется как утечка — гасятся **все** живые сессии пользователя (`AuthService.rotateTokens`).

`User.lastLoginAt` пишется в одном месте — `AuthService.issueTokens`. Это единственный путь выдачи пары токенов, поэтому одна отметка там покрывает register, login и refresh. Транзакции с созданием refresh-сессии намеренно нет: поле телеметрическое, в контракт `authUserSchema` не входит и наружу не отдаётся.

401 и 409 API отдаёт по-русски — веб показывает эти тексты как есть. 429 приходит от `ThrottlerGuard` по-английски, и его переводит уже фронтенд.

## Слой репозитория есть только у users

`modules/users` — единственный модуль с разделением на репозиторий и сервис: `UsersRepository` инкапсулирует Prisma (и вместе с `PrismaService` это единственные места, импортирующие `src/generated/prisma`), `UsersService` — тонкий фасад над ним, наружу модуль экспортирует только сервис. В `categories`/`transactions` сервисы по-прежнему обращаются к `PrismaService` напрямую, и доступ к `refresh_sessions` из `AuthService` — тоже. Неоднородность осознанная, не недосмотр; если будете вводить репозитории дальше, ориентируйтесь на `users.repository.ts`.

Мапперы (`*.mapper.ts`) при этом остаются независимыми от Prisma: они принимают структурные `*Like`-интерфейсы, а не сгенерированные типы.

## Деньги

В БД `Decimal(12,2)`. Наружу отдаётся **строка** (`amount.toFixed(2)` в мапперах) — иначе по пути к клиенту появился бы float. На входе контрактная схема даёт `z.coerce.number()` с ограничением двух знаков.

## Границы, которые легко сломать

- **В `apps/api` нет path-алиасов**, только относительные импорты: `nest build`/`tsc` не переписывают `paths` в выходном JS.
- `pnpm-workspace.yaml` в корне держит `prisma` и `argon2` в `onlyBuiltDependencies` — без этого pnpm 10 блокирует их postinstall, и клиент/нативный модуль не собираются.

## Актуализация документации

После изменения любых методов актуализируйте или добавьте JSDoc, а для DTO и контроллеров — декораторы Swagger.
