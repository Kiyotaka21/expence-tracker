# Слой репозитория для users + починка `lastLoginAt`

## Context

Запрос был «добавить в api авторизацию: модуль пользователя с репозиторием, сервис,
отдельный модуль авторизации с JWT, методы login и регистрации». Проверка показала,
что **авторизация уже реализована целиком** и переписывать её не нужно:

- [auth.module.ts](apps/api/src/modules/auth/auth.module.ts) + две passport-стратегии
  (`jwt`, `jwt-refresh`), глобальный `JwtAuthGuard` через `APP_GUARD` и `@Public()`;
- [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts) — `register`, `login`,
  `refresh`, `logout`, `me`; троттлинг 10/мин на register и login;
- [auth.service.ts](apps/api/src/modules/auth/auth.service.ts) — argon2id, ротация
  refresh-сессий с детекцией переиспользования, sha256 от токена в `refresh_sessions`;
- [users.module.ts](apps/api/src/modules/users/users.module.ts) + `UsersService` + `user.mapper.ts`;
- контракты в [packages/contracts/src/auth.ts](packages/contracts/src/auth.ts), формы входа
  и регистрации на вебе.

Реально не сделаны две вещи:

1. **Нет слоя репозитория.** `UsersService` ходит в `PrismaService` напрямую — единственный
   явно названный в запросе элемент, которого нет. Плюс его три метода — единственное место
   в кодовой базе без явных возвращаемых типов.
2. **Дрейф схемы по `lastLoginAt`.** Поле объявлено в
   [schema.prisma:19](apps/api/prisma/schema.prisma#L19) с комментарием «Последняя выдача пары
   токенов: register, login или refresh», но: колонки нет в
   [миграции init](apps/api/prisma/migrations/20260825110237_init/migration.sql#L2-L11), поля нет
   в сгенерированном клиенте, и никто его не пишет. Поле мёртвое.

**Скрытая мина.** Сейчас ничего не падает именно потому, что клиент сгенерирован из старой
схемы и о `lastLoginAt` не знает. Любой `prisma generate` **без** миграции научит клиент
селектить колонку, которой в БД нет, — и `findUnique` по пользователю начнёт падать,
то есть вход сломается. Поэтому миграция и генерация должны идти одной командой
`prisma migrate dev` (она применяет миграцию, затем генерирует клиент), а не по отдельности.

Итог: вводим `UsersRepository`, делаем `lastLoginAt` живым полем и закрываем дрейф.
Существующий auth не переписываем.

## Решения по объёму

- `lastLoginAt` **не выносим в контракт** `authUserSchema`. Это служебное поле; добавление
  его в `AuthUser` потянуло бы пересборку `packages/contracts`, правки маппера и типов на
  вебе — вне запроса. Поле остаётся внутренним.
- Доступ к `refresh_sessions` из `AuthService` **остаётся на `PrismaService`**. Просили
  репозиторий пользователя; вынос сессий — отдельная задача (см. «Осознанно не делаем»).
- Репозиторий — обычный `@Injectable()` класс, без интерфейса и DI-токена: тестов в проекте
  нет, подменять реализацию сейчас незачем.

## Шаг 1. `UsersRepository` — новый файл

Создать `apps/api/src/modules/users/users.repository.ts`.

Это граница Prisma, поэтому здесь — единственное место в модуле, где допустим импорт
сгенерированных типов: `import type { User } from '../../generated/prisma/client'`
(файл экспортирует `type User = Prisma.UserModel`). Сейчас из `generated` импортирует только
[prisma.service.ts:7](apps/api/src/prisma/prisma.service.ts#L7) — репозиторий станет вторым
и последним таким местом.

Важно: структурные `*Like`-интерфейсы в мапперах (`user.mapper.ts`) **не трогаем**. Они
намеренно не зависят от Prisma, и `toAuthUser` продолжает принимать `User` структурно.

Состав:

```ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  touchLastLogin(id: string): Promise<void>;
}
```

- `CreateUserData` — экспортируемый интерфейс `{ email: string; passwordHash: string; name?: string | null }`.
  Именно узкий тип, а не `Prisma.UserCreateInput`: не даём вызывающему протащить `id` или связи.
- `touchLastLogin` возвращает `Promise<void>` — результат `update` никому не нужен.
- Методы без `async`: возвращают промис Prisma напрямую, как это уже сделано в текущем
  `UsersService`.

## Шаг 2. `UsersService` — переключить на репозиторий

Правки в [users.service.ts](apps/api/src/modules/users/users.service.ts):

- в конструктор вместо `PrismaService` инжектится `UsersRepository`;
- три существующих метода делегируют в репозиторий и **получают явные возвращаемые типы**
  (`Promise<User | null>`, `Promise<User>`) — снимаем единственное в репозитории отступление
  от общего стиля;
- добавить `touchLastLogin(id: string): Promise<void>` делегатом.

Сервис остаётся тонким фасадом домена — своей логики у него пока нет, и это нормально:
он даёт `AuthService` стабильную точку входа, за которой можно менять хранилище. Изобретать
ему обязанности (например, переносить проверку «email занят» из `AuthService.register`)
в этой задаче не будем.

## Шаг 3. `UsersModule` — зарегистрировать провайдер

В [users.module.ts](apps/api/src/modules/users/users.module.ts) добавить `UsersRepository`
в `providers`. В `exports` его **не** добавлять: наружу модуль отдаёт только `UsersService`,
`AuthModule` о репозитории знать не должен.

`PrismaModule` импортировать не нужно — он `@Global()`.

## Шаг 4. Оживить `lastLoginAt`

Правка в [auth.service.ts](apps/api/src/modules/auth/auth.service.ts) — в `issueTokens`
(строки 99-110), сразу после создания refresh-сессии:

```ts
// issueTokens — единственный путь выдачи пары токенов, поэтому одна запись здесь
// покрывает register, login и refresh.
await Promise.all([
  this.prisma.refreshSession.create({ data: { ... } }),   // как сейчас
  this.users.touchLastLogin(user.id),
]);
```

`issueTokens` вызывается из `register`, `login` (через `AuthController.issue`) и
`rotateTokens` — ровно три случая из комментария к полю в схеме. Больше нигде править
не нужно.

Транзакцию сознательно **не** используем: `lastLoginAt` — телеметрия, а не инвариант,
и оборачивать её в транзакцию значило бы протащить tx-клиент через репозиторий.

## Шаг 5. Миграция

`lastLoginAt` уже есть в `schema.prisma`, поэтому схему править не нужно — Prisma сама
увидит расхождение с историей миграций.

```bash
docker compose up -d                       # если Postgres не поднят
pnpm --filter api exec prisma migrate dev --name user_last_login_at
```

Ожидаемый результат: новая папка `apps/api/prisma/migrations/<ts>_user_last_login_at/`
с единственным `ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);`, затем
автоматическая регенерация клиента в `apps/api/src/generated/prisma`.

Проверить, что в сгенерированной SQL **только** этот `ALTER TABLE`. Если Prisma предложит
`migrate reset` или сгенерирует что-то ещё — остановиться и разобраться: значит, дрейф шире,
чем одно поле, и это надо обсудить, а не сносить БД.

## Файлы

| Файл                                                                                       | Что                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `apps/api/src/modules/users/users.repository.ts`                                           | новый                                            |
| [apps/api/src/modules/users/users.service.ts](apps/api/src/modules/users/users.service.ts) | инжект репозитория, явные типы, `touchLastLogin` |
| [apps/api/src/modules/users/users.module.ts](apps/api/src/modules/users/users.module.ts)   | `UsersRepository` в `providers`                  |
| [apps/api/src/modules/auth/auth.service.ts](apps/api/src/modules/auth/auth.service.ts)     | запись `lastLoginAt` в `issueTokens`             |
| `apps/api/prisma/migrations/<ts>_user_last_login_at/migration.sql`                         | генерируется Prisma                              |

Контракты, контроллеры, стратегии, гварды, `user.mapper.ts` и веб — **не трогаем**.

## Проверка

Сначала статика:

```bash
pnpm --filter api typecheck
pnpm --filter api lint
```

Затем сквозной прогон против живой БД. Токены в httpOnly cookie, поэтому нужен
cookie jar (`-c`/`-b`), иначе `me` и `refresh` вернут 401:

```bash
pnpm --filter api dev          # в отдельном терминале

# 1. Регистрация — 201 + AuthUser, ставит обе cookie
curl -i -c jar.txt -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","password":"probe12345","name":"Probe"}'

# 2. Текущий пользователь — 200
curl -i -b jar.txt http://localhost:4000/api/auth/me

# 3. Ротация — 200, обе cookie перезаписаны
curl -i -b jar.txt -c jar.txt -X POST http://localhost:4000/api/auth/refresh

# 4. Выход — 200, cookie очищены
curl -i -b jar.txt -c jar.txt -X POST http://localhost:4000/api/auth/logout

# 5. Повторный вход
curl -i -c jar.txt -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","password":"probe12345"}'
```

Главное, что подтверждает задачу — `lastLoginAt` заполняется и обновляется:

```bash
pnpm --filter api db:studio    # таблица users, колонка lastLoginAt
```

Ожидаем: после шага 1 значение непустое; после шага 3 (refresh) и шага 5 (login) —
обновилось. Если поле осталось `null`, значит `touchLastLogin` не вызывается из
`issueTokens`.

Регрессия на неполоманность гвардов — защищённый маршрут без cookie должен дать 401:

```bash
curl -i http://localhost:4000/api/categories        # ожидаем 401
curl -i -b jar.txt http://localhost:4000/api/categories   # ожидаем 200
```

Swagger как быстрая визуальная проверка: http://localhost:4000/api/docs — состав схем
не должен измениться, потому что контракты мы не трогали.

## Осознанно не делаем

- `SessionsRepository` для `refresh_sessions` — `AuthService` продолжает работать с
  `PrismaService` напрямую. После этой задачи слои в модуле users и в auth будут
  неоднородны; это осознанный компромисс, а не недосмотр.
- Репозитории в `categories`/`expenses` — вы выбрали ограничиться users.
- Смена пароля, список активных сессий, роли/RBAC, тесты.
- **Отдельно стоит поправить документацию.** Раздел «Состояние репозитория» в
  [CLAUDE.md](CLAUDE.md) и «Состояние заготовки» в [README.md](README.md) утверждают, что
  `pnpm install` не запускался и миграций нет — обе записи устарели: `node_modules`,
  `pnpm-lock.yaml`, миграция init и собранный `dist` существуют. В этот план правку не
  включаю, скажите — обновлю отдельным шагом.
