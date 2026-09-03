# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Монорепозиторий трекера расходов на pnpm workspaces + Turborepo:

- `apps/api` — Nest 11, REST + Swagger, Prisma 7, PostgreSQL. Порт 4000, глобальный префикс `/api`, Swagger на `/api/docs`. Своя памятка: [apps/api/CLAUDE.md](apps/api/CLAUDE.md).
- `apps/web` — Next 16 (App Router, Turbopack), Tailwind CSS v4, TanStack Query, shadcn/ui. Архитектура Feature-Sliced Design. Порт 3000. Своя памятка: [apps/web/CLAUDE.md](apps/web/CLAUDE.md).
- `packages/contracts` — zod-схемы и типы DTO, общие для обоих приложений.
- `packages/eslint-config`, `packages/tsconfig` — общие пресеты.

Этот файл — про репозиторий целиком: процесс, общие команды, контракты и границы, задевающие оба приложения. Всё, что нужно только одной стороне — Prisma и Nest, FSD и shadcn/ui, — лежит в памятках приложений.

## Состояние репозитория

Рабочая заготовка. Зависимости установлены (`node_modules`, `pnpm-lock.yaml` на месте), применены три миграции Prisma, клиент сгенерирован в `apps/api/src/generated/prisma`. `pnpm typecheck`, `pnpm lint` и `pnpm build` проходят по всем пакетам. Аутентификация работает end-to-end: регистрация, вход, ротация refresh-токенов, отзыв сессий. Фронтенд целиком переведён на Feature-Sliced Design и shadcn/ui.

Дизайн веба переработан под финансовый дашборд: тёмная рельса навигации, панель содержимого на градиентном холсте, свои токены палитры и пара шрифтов Inter + Manrope — устройство и запреты в [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

Тесты только начаты: Vitest заведён в `apps/api` и покрывает `AuthService`; в `apps/web` и `packages/contracts` раннера ещё нет. CI по-прежнему нет. Что готово, а что осталось скелетом, — в памятках приложений.

Работа ведётся по GitHub Flow, git-история — по Conventional Commits: правила ветвления в разделе «Ветки», формат коммитов и разбивку — в разделе «Коммиты».

Порядок запуска на чистой машине описан в [README.md](README.md).

## Команды

```bash
pnpm dev                  # web + api в watch (turbo, с учётом графа сборки)
pnpm build                # сборка всех пакетов
pnpm lint                 # eslint по всем пакетам
pnpm typecheck            # tsc --noEmit по всем пакетам
pnpm test                 # vitest run в пакетах, где он заведён (пока только api)
pnpm format               # prettier по репозиторию

pnpm --filter api dev     # только backend
pnpm --filter web dev     # только frontend
pnpm --filter @expence/contracts dev   # tsc --watch для контрактов
```

Работа с БД (`pnpm db:migrate`, `db:generate`, `db:seed`, `db:studio`, `docker compose up -d`) и CLI shadcn описаны в памятках `apps/api` и `apps/web` — там же оговорки, без которых команды дают неожиданный результат.

Тестовый раннер — Vitest, заведён только в `apps/api`. В `apps/web` и `packages/contracts` его ещё нет: заводит его скилл [test](.claude/skills/test/SKILL.md) при первом тесте в пакете, отдельным коммитом.

Флаги в скрипты пакета передавайте через `exec`, а не `run`: `pnpm --filter api exec prisma migrate dev --name init`.

## Скиллы

Процедуры, которые вызываются командой и лежат в `.claude/skills/<имя>/SKILL.md`:

| Скилл                                      | Когда                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [commit](.claude/skills/commit/SKILL.md)   | любой коммит: ветка, разбивка на единицы работы, проверки, сообщение, пуш                                                |
| [pr](.claude/skills/pr/SKILL.md)           | открыть pull request: аргументы `<заголовок>` и `[ветка]`, состояние ветки, проверки, тело файлом, `gh pr create`        |
| [standup](.claude/skills/standup/SKILL.md) | отчёт за вчерашний день для стендапа. Только вручную командой `/standup`: в frontmatter `disable-model-invocation: true` |
| [test](.claude/skills/test/SKILL.md)       | тест на файл: аргументы `<путь к файлу>` и `[что проверить]`, вид теста по слою, спека рядом с исходником, прогон        |

Отчётные и прочие «по команде» процедуры помечайте `disable-model-invocation: true`, иначе агент начнёт запускать их сам, когда решит, что описание подходит.

## Ветки

Работаем по [GitHub Flow](https://docs.github.com/ru/get-started/using-github/github-flow): `main` всегда собирается и деплоится, вся работа идёт в короткоживущих ветках от свежего `main`, обратно — только через pull request.

- **В `main` не коммитим напрямую.** Правка документации — тоже ветка и тоже PR: `main` остаётся веткой, в которую только вливают.
- **Имя ветки**: `<тип>/<область>-<что>`, латиница, kebab-case — словарь типов и областей, разбор `feature/` против `feat` и примеры в скилле [commit](.claude/skills/commit/SKILL.md).
- **Одна ветка — одна законченная фича и один PR.** Разрослась — дробим на несколько ветвей, а не ведём месяцами: длинная ветка расходится с `main`, и конфликты приходится разрешать в `contracts`, которые видят сразу оба приложения.
- **Ветку обновляем ребейзом**, не merge-коммитом: история линейная, и мы её такой держим. После ребейза опубликованную ветку пушим `--force-with-lease`, никогда просто `--force`.
- **Влить PR** — «Rebase and merge»: коммиты в ветке по правилам скилла `commit` осмысленные, схлопывать их незачем. «Squash and merge» — только для черновой истории с `wip`-коммитами.
- **CI нет**, поэтому единственный барьер перед PR — руки: `pnpm typecheck`, `pnpm lint`, `pnpm build`. Не проходит — PR не открываем.
- **После влития** удаляем ветку и на GitHub, и локально: через неделю она уже не про ту базу, а в списке ветвей мешает.

Полный цикл:

```bash
git switch main && git pull --ff-only        # стартуем всегда со свежего main
git switch -c feature/web-landing-page       # ветка под фичу
# ... работа, коммиты по скиллу commit ...
pnpm typecheck && pnpm lint && pnpm build    # вместо CI
git push -u origin feature/web-landing-page
# дальше PR — скилл pr: `/pr '<заголовок>' [ветка]`

git pull --rebase origin main                # если main уехал вперёд
git push --force-with-lease

# после влития
git switch main && git pull --ff-only
git branch -d feature/web-landing-page
git push origin --delete feature/web-landing-page
```

## Pull request

**Процедура PR живёт в скилле [pr](.claude/skills/pr/SKILL.md) — вызывайте `/pr '<заголовок>' [ветка]`.** Здесь она не пересказывается: в одном месте и разбор аргументов, и проверка состояния ветки перед PR, и структура тела, и вызов `gh` по полному пути (в PATH его нет), и что делать после создания.

Два правила, которые скилл не отменяет: **`main` — единственная база**, а **заголовок PR оформляется как заголовок коммита** (скилл [commit](.claude/skills/commit/SKILL.md)) — область берётся по преобладающей части диффа, так что PR, где заодно правились сиды и документация, но основная работа в вебе, остаётся `feat(web)`, а не теряет область.

## Коммиты

**Правила коммита живут в скилле [commit](.claude/skills/commit/SKILL.md) — вызывайте `/commit` перед тем, как коммитить.** Здесь они не пересказываются: в одном месте и имя ветки, и разбивка на единицы работы, и проверки перед коммитом, и формат сообщения по Conventional Commits с текстом по-русски, и пуш.

Скиллом же оформляются правки по ревью и коммиты в чужую ветку — процедура одна на все случаи.

## Обновление docs

При добавлении функционала проверяйте документацию в `.claude/docs/*` и актуализируйте её. Это часть той же единицы работы, что и код: документация едет в том же коммите, а не отдельным заходом «потом».

| Документ                                              | Что в нём                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| [architecture.md](.claude/docs/architecture.md)       | карта пакетов, слои бэкенда и FSD, сквозные сценарии   |
| [api.md](.claude/docs/api.md)                         | ручки: параметры, форма ответа, коды ошибок и их смысл |
| [database.md](.claude/docs/database.md)               | таблицы, назначение полей, индексы, миграции           |
| [developer-guide.md](.claude/docs/developer-guide.md) | запуск, типовые задачи, процесс до PR, грабли          |

Не каждая правка задевает все четыре: новая ручка — это `api.md`, новое поле — ещё и `database.md`, новый слой или зависимость между пакетами — `architecture.md`. Меняется порядок работы или появляется новая команда — `developer-guide.md`.

Границу с памятками держим так: в `CLAUDE.md` — правила и запреты, в `.claude/docs` — объяснение устройства. Одно и то же не пересказываем дважды, ссылаемся.

## Архитектура: что нужно понять до правок

### Контракт API — единственный источник правды

Все DTO описаны zod-схемами в `packages/contracts`. Оттуда они расходятся в три места:

- Nest: `createZodDto(schema)` в `dto.ts` каждого модуля + глобальный `ZodValidationPipe` (`APP_PIPE` в `app.module.ts`) → валидация `@Body`/`@Query`/`@Param`.
- Swagger: схемы выводятся из тех же zod-описаний, `cleanupOpenApiDoc()` в `main.ts` приводит их к валидному OpenAPI.
- Next: формы через `zodResolver`.

Меняете форму запроса или ответа — правьте схему в `packages/contracts`, а не DTO в модуле.

### Contracts собирается в dist, и это влияет на порядок задач

Пакет компилируется `tsc` в CommonJS (`dist` + `.d.ts`), поэтому Nest и Next потребляют его без `transpilePackages`. Цена: правки в контрактах не видны приложениям до пересборки. Поэтому у `dev`, `build`, `lint` и `typecheck` в `turbo.json` стоит `dependsOn: ["^build"]`. При ручном запуске одного приложения держите рядом `pnpm --filter @expence/contracts dev`.

### Аутентификация: что общего у двух сторон

Оба токена лежат в httpOnly cookie, которые ставит API на порту 4000; браузер не различает порты, поэтому на 3000 они видны. Refresh-cookie ограничена путём `/api/auth` и не ходит с обычными запросами. Refresh делает ротацию сессии, повторное использование отозванного токена гасит все сессии пользователя.

Отсюда деление ответственности: сервер решает, валиден ли токен, а веб может проверить только факт наличия cookie — значение httpOnly ему недоступно. Серверная половина (гварды, ротация, `refresh_sessions`) — в [apps/api/CLAUDE.md](apps/api/CLAUDE.md), клиентская (proxy, редиректы, тексты ошибок) — в [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

### Деньги

В БД `Decimal(12,2)`, наружу сумма отдаётся **строкой** — иначе по пути к клиенту появился бы float. На входе контрактная схема даёт `z.coerce.number()` с ограничением двух знаков. Это правило контракта: обе стороны обязаны его соблюдать, детали сериализации и работы форм — в памятках приложений.

## Границы, которые легко сломать

- **TypeScript закреплён на 5.9.3**, хотя в реестре есть 7.x: `typescript-eslint@8` объявляет `typescript: >=4.8.4 <6.1.0`. Bump TS — только вместе с мажором typescript-eslint.
- **ESLint закреплён на 9.39.5, поднимать до 10 нельзя.** `eslint-config-next@16` тянет `eslint-plugin-react@7.37`, который на ESLint 10 падает с `contextOrFilename.getFilename is not a function` — линт веба просто не запускается. npm помечает 9.x как deprecated, это ожидаемо; ждём совместимый `eslint-plugin-react`.
- **`eslint-config-next` живёт только в `packages/eslint-config`**, и `next.mjs` намеренно не композитится с `base.mjs`: конфиг Next уже подключает typescript-eslint и react-hooks, а повторное определение того же плагина в flat-config — ошибка ESLint.
- `pnpm-workspace.yaml` содержит `onlyBuiltDependencies` — pnpm 10 иначе блокирует postinstall у `prisma`, `argon2`, `@tailwindcss/oxide`. Рядом `ignoredBuiltDependencies` с `@scarf/scarf` (телеметрия, пришла с `radix-ui`), иначе pnpm спрашивает про него на каждой установке.
- **`prettier-plugin-tailwindcss` нужен и в корневых devDependencies.** Конфиг с плагином лежит в `apps/web/.prettierrc.json`, но `pnpm format` запускается из корня, а плагины prettier резолвит от cwd, не от места конфига — без корневой зависимости команда падает на файлах веба.
- Версии зависимостей в репозитории закреплены точно, без `^`.
