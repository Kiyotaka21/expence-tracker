# Гайд для разработчиков

Что делать руками: поднять проект, провести типовую задачу от ветки до PR, не наступить на
известные грабли. Как всё устроено — [architecture.md](architecture.md), ручки —
[api.md](api.md), таблицы — [database.md](database.md).

## Требования

- **Node.js ≥ 24** (проверено на 24.12)
- **pnpm 10.33+** — `corepack enable && corepack use pnpm@10.33.0`
- **Docker** — для локального PostgreSQL
- **Доступ в интернет при сборке веба**: шрифты Inter и Manrope подключены через
  `next/font/google` и скачиваются на этапе сборки. `next build` без сети упадёт.

## Первый запуск

```bash
pnpm install

cp .env.example .env                       # переменные для docker-compose
cp apps/api/.env.example apps/api/.env     # секреты и подключение к БД
cp apps/web/.env.example apps/web/.env.local

docker compose up -d                       # PostgreSQL 17 на 5432

pnpm db:migrate                            # применить миграции
pnpm db:generate                           # СГЕНЕРИРОВАТЬ КЛИЕНТ — отдельная команда
pnpm --filter api db:seed                  # опционально: демо-данные

pnpm dev                                   # web + api в watch
```

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/health
- Демо-логин после сидов: `demo@expence.local` / `demo12345`

**Секреты для локальной разработки** сгенерируйте свои — в `.env.example` стоят заглушки,
а схема требует минимум 32 символа:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Переменные окружения

`apps/api/.env` (валидируется `validateEnv` на старте — приложение падает сразу, а не на
первом запросе):

| Переменная               | По умолчанию            | Смысл                                        |
| ------------------------ | ----------------------- | -------------------------------------------- |
| `NODE_ENV`               | `development`           | В `production` cookie получают флаг `secure` |
| `PORT`                   | `4000`                  |                                              |
| `DATABASE_URL`           | — (обязательна)         | Должна совпадать с `docker-compose.yml`      |
| `WEB_ORIGIN`             | `http://localhost:3000` | Origin для CORS с credentials                |
| `JWT_ACCESS_SECRET`      | — (обязательна)         | Минимум 32 символа                           |
| `JWT_REFRESH_SECRET`     | — (обязательна)         | Минимум 32 символа, **другой**               |
| `ACCESS_TOKEN_TTL`       | `15m`                   | Формат ms/jsonwebtoken                       |
| `REFRESH_TOKEN_TTL_DAYS` | `30`                    |                                              |
| `COOKIE_DOMAIN`          | пусто                   | Для localhost оставить пустым                |

`apps/web/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000/api` — вместе с префиксом.

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

pnpm db:migrate           # prisma migrate dev
pnpm db:generate          # генерация клиента
pnpm db:seed              # демо-данные
pnpm db:studio            # Prisma Studio
pnpm docker:up            # docker compose up -d
pnpm docker:down
```

Две оговорки, без которых команды дают неожиданный результат:

1. **Запускаете одно приложение — держите рядом watch контрактов.** `pnpm dev` через turbo
   пересоберёт их сам, `pnpm --filter web dev` — нет.
2. **Флаги в скрипты пакета передавайте через `exec`, а не `run`:**
   `pnpm --filter api exec prisma migrate dev --name init`.

Тесты гоняет Vitest: `pnpm test` из корня или `pnpm --filter api test` (в `apps/api` есть
ещё `test:watch`). Заведён он пока только в `apps/api` — в `apps/web` и
`packages/contracts` раннера нет, и первый тест там заведёт его сам: см. «Написать тест на
файл» ниже.

## Типовые задачи

### Добавить или изменить поле в API

Порядок такой, и он не случаен: контракт первым, иначе половинчатое изменение просто не
соберётся.

1. **Схема в `packages/contracts/src/<сущность>.ts`.** Тип выведется через `z.infer`.
2. **Миграция**, если поле новое: правите `schema.prisma`, затем `pnpm db:migrate`, затем
   `pnpm db:generate`.
3. **Сервис и маппер** в `apps/api/src/modules/<модуль>`. Маппер принимает структурный
   `*Like`-интерфейс — добавьте поле и туда.
4. **Фронтенд**: запрос в `entities/<сущность>/api`, форма — та же контрактная схема через
   `zodResolver`.
5. **JSDoc и Swagger** — по правилу из `apps/api/CLAUDE.md`: у метода описание, `@param`,
   `@returns`, `@throws`; у контроллера — декораторы ответов, включая коды ошибок.

DTO в `dto.ts` править не нужно: `createZodDto(schema)` подхватит изменение сам.

Всё это — **один коммит**: контракты компилируются в `dist`, и правка формы без обеих
сторон ломает и API, и веб.

### Добавить эндпоинт

1. Схемы запроса и ответа в контрактах.
2. `createZodDto` в `dto.ts` модуля.
3. Метод сервиса — с проверкой владельца (`userId` в `where`), исключениями из
   `@nestjs/common` и русским текстом ошибки.
4. Метод контроллера — `@ApiOperation`, декоратор ответа под **реальный** код
   (`@ApiCreatedResponse` для 201, `@ApiNoContentResponse` для 204, не `@ApiOkResponse`
   везде подряд) и `@Api*Response` на ошибки.
5. JSDoc с `@throws` на оба метода.

Порядок маршрутов в контроллере имеет значение: статический путь объявляется **до**
параметрического, иначе `:id` перехватит слово (`GET /transactions/summary` стоит выше
`GET /transactions/:id`).

### Добавить миграцию

```bash
pnpm db:migrate                 # интерактивно спросит имя
pnpm db:generate                # обязательно после
```

**Переименование модели** — особый случай: Prisma развернёт его в `DROP` + `CREATE` и
потеряет данные. Создавайте миграцию через `--create-only`, замените SQL на
`ALTER TABLE ... RENAME` руками и применяйте через `prisma migrate deploy`. Образец —
`20260831133953_expenses_to_transactions`.

### Добавить компонент shadcn/ui

```bash
pnpm --filter web exec shadcn@latest add <component>
pnpm --filter web exec shadcn@latest docs <component>   # документация и примеры
```

Компонент попадёт в `apps/web/src/shared/ui` по алиасам из `components.json`. **После
установки проверьте `apps/web/package.json`**: CLI ставит зависимости с кареткой, а в
репозитории версии закреплены точно.

Компоненты `form` в стиле `radix-nova` нет — формы собираются из `field` и `Controller`
react-hook-form.

### Добавить экран

1. `src/app/(группа)/<путь>/page.tsx` — тонкая обёртка: `metadata` и рендер компонента.
2. `src/views/<slice>/ui/<slice>-page.tsx` — сборка экрана из виджетов и фич, плюс
   `index.ts`.
3. Маршрут — в `shared/config/routes.ts`: его знают и proxy, и навигация.
4. Нужен доступ без сессии — добавьте путь в `PUBLIC_ROUTES`.

### Проверить вёрстку после правки

`/ui-check [маршрут или что проверить]` — скилл [ui-check](../skills/ui-check/SKILL.md):
выводит из диффа `apps/web`, какие экраны задеты, поднимает браузер через Playwright MCP по
живому `next dev` и снимает каждый маршрут минимум в двух профилях — 1440×900 и 390×844.

Раскладка веба переключается на двух границах, и кадры по обе стороны от них нужны, как
только правка задевает оболочку: `lg` (1024px) меняет рельсу `app-sidebar` на мобильную
шапку `app-topbar`, `sm` (640px) убирает у панели скругление и отступы. Защищённые маршруты
требуют сессии, поэтому скилл входит через форму демо-пользователем из сидов
(`demo@expence.local` / `demo12345`) — cookie httpOnly, руками её не подложить, а значит
нужны и API, и Postgres с применёнными сидами.

Горизонтальное переполнение проверяется числом (`document.documentElement.scrollWidth`
против `window.innerWidth`), а не по картинке: лишние пиксели на скриншоте не видны.
Мобильные ширины снимаются именно Playwright, а не статическим харнессом на headless
Chrome, — у того минимальная ширина окна около 500px, и на `--window-size=390` он отдаёт
обрезанный кадр, который выглядит как сломанная адаптивность при целой вёрстке. Скриншоты
Playwright пишет в `.playwright-mcp/`, каталог в `.gitignore` — в коммит они не едут.

### Написать тест на файл

`/test <путь к файлу> [что проверить]` — скилл [test](../skills/test/SKILL.md): читает
файл, выбирает вид теста по слою (контрактная схема, маппер или сервис Nest, чистая
функция веба), кладёт спеку рядом с исходником под именем `<имя>.spec.ts` и прогоняет её.

В `apps/api` Vitest уже заведён (`vitest.config.ts`, спеки исключены из
`tsconfig.build.json`, задача `test` в `turbo.json`). В `apps/web` и
`packages/contracts` — нет, и первый тест там ставит раннер отдельным коммитом до самого
теста. Оговорки, из-за которых это не сводится к `pnpm add -D vitest`: спеки в
`packages/contracts` уедут в опубликованный `dist`, если не разделить tsconfig, как в
`apps/api`; тестам компонентов веба нужны `jsdom` и Testing Library; Nest-овский
`Test.createTestingModule` под Vitest не поднимется — esbuild не умеет
`emitDecoratorMetadata`, поэтому сервисы конструируются руками с моками. Образец такого
теста — `apps/api/src/modules/auth/auth.service.spec.ts`: хранилище сессий там сделано
объектом в памяти, и проверяется состояние после ротации, а не вызовы Prisma.

### Собрать отчёт за день

`/standup` — отчёт для стендапа за вчерашний день: коммиты по всем ветвям с «зачем» из тела
коммита, влитые и открытые PR, незакоммиченная работа и последствия для команды (миграции,
правки контрактов, новые зависимости).

Скилл только читает и вызывается **исключительно вручную**: в его frontmatter стоит
`disable-model-invocation: true`, поэтому агент сам его не запустит. Если вчера коммитов не
было — выходные, отпуск, — отчёт будет за последний день с активностью, и дата названа в
заголовке.

## Процесс: ветка → коммиты → PR

Работаем по [GitHub Flow](https://docs.github.com/ru/get-started/using-github/github-flow):
`main` всегда собирается, вся работа — в короткоживущих ветках, обратно только через pull
request. **В `main` не коммитим напрямую**, правка документации — тоже ветка и тоже PR.

Ниже — картина процесса целиком. Пошаговая процедура коммита, по которой работает агент,
собрана в скилле [commit](../skills/commit/SKILL.md) (`/commit`): ветка, разбивка на
единицы работы, проверки, сообщение, пуш. PR открывает скилл
[pr](../skills/pr/SKILL.md) (`/pr '<заголовок>' [ветка]`).

### Ветка

Имя: `<тип>/<область>-<что>`, латиница, kebab-case. Тип фичи пишется полным словом
(`feature/`), в коммите — `feat`: Conventional Commits допускает в заголовке только `feat`,
у ветвей такого ограничения нет.

```bash
git switch main && git pull --ff-only
git switch -c feature/web-landing-page
```

Примеры: `feature/api-monthly-report`, `fix/web-refresh-race`, `chore/deps-bump-prisma`,
`docs/api-transactions-jsdoc`.

Одна ветка — одна законченная фича и один PR. Обновляется **ребейзом**, не merge-коммитом:
история линейная. После ребейза опубликованную ветку пушим `--force-with-lease`, никогда
просто `--force`.

### Коммит

```
<тип>(<область>): <что делает коммит>

<зачем это нужно: ограничения, отвергнутые альтернативы, подводные камни>

<BREAKING CHANGE и ссылки — если есть>
```

**Типы:** `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `build`, `ci`,
`chore`, `revert`. **Области:** `api`, `web`, `contracts`, `config`, `deps`; опускается,
когда правка задевает весь репозиторий.

Заголовок — до 72 символов, императив, с маленькой буквы, без точки. **Тело объясняет
«зачем», а не «что»**: «что» видно в диффе. Ломающее изменение — `!` перед двоеточием и
абзац `BREAKING CHANGE` в футере; для `contracts` ломающей считается любая правка формы
запроса или ответа.

Один коммит — одна законченная единица работы: миграция едет вместе с кодом, который её
использует, правка контракта — вместе с обеими сторонами.

### Перед PR

**CI нет**, поэтому единственный барьер — руки:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Не проходит — PR не открываем.

В индекс не должны попадать `.env*` (кроме `*.example`), `dist`, `.next`, `.turbo` и
сгенерированный `apps/api/src/generated` — всё это в `.gitignore`.

### Pull request

Открывает PR скилл [pr](../skills/pr/SKILL.md): `/pr '<заголовок PR>' [ветка]`. Первый
аргумент — заголовок, второй — ветка-источник, без него берётся текущая. Скилл сам
дотягивает ветку до `origin/main` ребейзом, гоняет проверки, собирает тело в скрэтчпаде и
вызывает `gh`. Ниже — то же самое руками.

**`gh` установлен, но не в PATH** — ни Git Bash, ни PowerShell его не видят:

```bash
GH='/c/Program Files/GitHub CLI/gh.exe'
"$GH" pr create --base main --head feature/web-main-screen \
  --title 'feat(web): собрать главный экран с меню, профилем и пагинацией' \
  --body-file /path/to/pr-body.md
```

- **Заголовок — по правилам заголовка коммита.** Область — по преобладающей части диффа.
- **`--fill` не используем**: при нескольких коммитах он подставит описание одной части
  работы вместо описания целого.
- **Тело передаём файлом** (`--body-file`), а не `--body`: markdown со списками в одной
  строке аргумента разъезжается. Файл держим вне репозитория.
- **В теле:** что делает PR; разбивка по коммитам; решения, которых не видно в диффе; как
  проверяли; что осталось вне объёма.
- **Проверки перечисляем явно** — и отдельно то, что проверить не удалось. Умолчание
  ревьюер прочтёт как «проверено».
- Влить — **«Rebase and merge»**. «Squash and merge» — только для черновой истории с
  `wip`-коммитами.

### После влития

```bash
git switch main && git pull --ff-only
git branch -d feature/web-landing-page
git push origin --delete feature/web-landing-page
```

## Грабли

**Сборка и зависимости**

- **Правки в контрактах не видны приложениям без пересборки.** Симптом: TypeScript ругается
  на поле, которое вы только что добавили. Лечение — `pnpm --filter @expence/contracts dev`
  рядом.
- **Не поднимайте TypeScript выше 5.9.3 и ESLint выше 9.39.5.** Первое ломает
  `typescript-eslint@8`, второе — линт веба целиком (`eslint-plugin-react` падает на
  ESLint 10). npm помечает ESLint 9.x как deprecated — это ожидаемо.
- **`prettier-plugin-tailwindcss` нужен и в корневых devDependencies.** Конфиг с плагином
  лежит в `apps/web/.prettierrc.json`, но `pnpm format` запускается из корня, а плагины
  prettier резолвит от cwd — без корневой зависимости команда падает на файлах веба.
- **`pnpm format` форматирует весь репозиторий.** Если в файлах, которых вы не касались,
  накопился дрейф, он попадёт в ваш дифф. Правьте точечно:
  `pnpm exec prettier --write <файл>`.

**База данных**

- **`prisma migrate dev` не генерирует клиент** — в отличие от Prisma 6.x. Всегда две
  команды, и порядок важен: сначала миграция, потом генерация.
- **`new PrismaClient()` без driver adapter бросает ошибку.** В Prisma 7 адаптер
  обязателен.

**Фронтенд**

- **`next lint` в Next 16 удалён**: скрипт `lint` вызывает `eslint .` напрямую.
- **`AGENTS.md` в `apps/web` пишет сам `next dev`** — блок `nextjs-agent-rules`
  восстанавливается при каждом запуске, удалять его из диффа бесполезно.
- **Импорт вверх по слоям и в соседний срез запрещён** — поймает `no-restricted-imports`.
  Общий код опускается слоем ниже.
- **`?from=` проходит через `safeInternalPath`.** Значение приходит от пользователя, и без
  проверки получился бы открытый редирект.

**API**

- **Статический маршрут объявляется до параметрического**, иначе `:id` перехватит слово.
- **Валидация ответов выключена намеренно.** Забыли маппер — наружу уедет `Decimal` и
  `Date`, и никто не остановит.
- **Ошибку валидации клиент показывает по-английски**: `message` от nestjs-zod — это
  `"Validation failed"`, а осмысленный текст лежит в `errors[]`. Доменные ошибки (401,
  404, 409) API отдаёт по-русски.
