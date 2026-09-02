@AGENTS.md

# apps/web

Next 16 (App Router, Turbopack), Tailwind CSS v4, TanStack Query, shadcn/ui. Архитектура Feature-Sliced Design. Порт 3000.

Общее для всего репозитория — ветки, pull request, контракты в `packages/contracts` — в корневом [CLAUDE.md](../../CLAUDE.md), процедуры коммита и PR — в скиллах [commit](../../.claude/skills/commit/SKILL.md) и [pr](../../.claude/skills/pr/SKILL.md). Здесь только то, что нужно при правках веба.

## Состояние

Фронтенд целиком переведён на Feature-Sliced Design и shadcn/ui (`radix-nova`). Страницы входа и регистрации собраны на `Field` + `react-hook-form` + контрактные схемы; остальные экраны собраны в слоях. `/dashboard` — главный экран: сводка за месяц, карточка профиля, меню создания и список операций с фильтрами и пагинацией по 10 записей. Списки транзакций и категорий вынесены в виджеты — те же самые показывают `/transactions` и `/categories`.

Тестов и тестового раннера нет — решение осознанное. В интерфейсе нет переключателя темы: тема следует настройке ОС.

## Команды

```bash
pnpm --filter web dev     # только frontend (рядом держите pnpm --filter @expence/contracts dev)

# новый компонент shadcn/ui (пишется в apps/web/src/shared/ui по components.json)
pnpm --filter web exec shadcn@latest add <component>
pnpm --filter web exec shadcn@latest docs <component>   # ссылки на документацию и примеры
```

Флаги в скрипты пакета передавайте через `exec`, а не `run`.

## Feature-Sliced Design

Слои сверху вниз: `app` → `views` → `widgets` → `features` → `entities` → `shared`. Импортировать можно только вниз и только через публичный API среза.

Две адаптации под App Router:

- **`src/app` — одновременно роутер Next и слой `app` FSD.** `layout.tsx`/`page.tsx` остаются маршрутами, рядом лежат `providers.tsx` (TanStack Query, next-themes, Toaster) и `globals.css`. Отдельного каталога для слоя `app` нет.
- **Слой `pages` из FSD называется `views`.** Имя `pages` в Next зарезервировано за Pages Router, поэтому композиции экранов живут в `src/views/<slice>/ui/<slice>-page.tsx`, а `page.tsx` роутера — тонкая обёртка: `metadata` и рендер компонента из `views`.

Что где лежит:

| Слой       | Содержимое                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `views`    | `login`, `register`, `dashboard` (главный экран), `transactions`, `categories`, `terms`, `privacy` — сборка экрана из виджетов и фич      |
| `widgets`  | `app-header` (шапка и меню профиля), `transaction-list` (фильтры + пагинация), `category-list`, `create-menu`, `profile-card`             |
| `features` | действия: `auth/{login,register,logout}`, `category/{category-form,delete-category}`, `transaction/{transaction-form,delete-transaction}` |
| `entities` | `session`, `category`, `transaction` — запросы к API, ключи кэша, хуки над `useQuery`, атомарный UI (`CategoryIcon`, `TransactionAmount`) |
| `shared`   | `api/client.ts` (fetch + refresh + `ApiError`), `config/{env,routes,session}`, `lib/{utils,format,redirect}`, `ui` (shadcn и обёртки)     |

Правила проверяет линтер — `no-restricted-imports` в `apps/web/eslint.config.mjs`:

- импорт вверх по слоям запрещён;
- импорт в соседний срез того же слоя запрещён — общий код опускается слоем ниже;
- `shared` — исключение: у него нет срезов, только сегменты, и они друг о друге знают (`shared/ui/field.tsx` импортирует `shared/ui/label.tsx`).

Правило смотрит на алиас `@/<слой>/...`, поэтому относительные импорты внутри среза его не задевают — так и задумано: внутри среза ходите относительными путями, наружу — через `index.ts`.

**Публичный API.** У каждого среза `views`/`widgets`/`features`/`entities` есть `index.ts`, и только он виден снаружи. `shared` импортируется по модулям (`@/shared/ui/button`, `@/shared/lib/format`) — барреля у него нет намеренно: так CLI shadcn пишет файлы в привычном ему виде, а proxy не тянет в свой бандл `env.ts`.

## shadcn/ui

Компоненты живут не в зависимостях, а в коде: куда их писать, описано в `apps/web/components.json`. Стиль — `radix-nova` (Radix UI + lucide + Geist), база `neutral`, `primary`/`ring` переопределены на индиго прежней фирменной палитры в `globals.css`. Своего набора UI-примитивов (бывший `src/components/ui`) больше нет.

- **Алиасы в `components.json` указывают на слои FSD** (`ui` → `@/shared/ui`, `lib` → `@/shared/lib`, `utils` → `@/shared/lib/utils`). Меняете структуру — правьте и их, иначе `shadcn add` создаст `src/components/ui` и слои разъедутся.
- **Пакет `shadcn` нужен не только как CLI**: `globals.css` делает `@import 'shadcn/tailwind.css'` — оттуда keyframes и варианты `data-*`. Поэтому он в `dependencies`, а не в dev. Убрать можно только через `shadcn eject`, который встроит этот CSS в проект.
- **Компонента `form` в стиле `radix-nova` нет** — в реестре пустой элемент. Формы собираются из `field` и `Controller` из react-hook-form: `<Field data-invalid={fieldState.invalid}>`, `aria-invalid` на контроле, `<FieldError errors={[fieldState.error]} />`. Это официальный путь, ссылки на документацию даёт `shadcn docs field`.
- **`error-alert.tsx` и `password-input.tsx` в `shared/ui` — свои, не из реестра.** Первый — единая плашка ошибки запроса, второй — поле пароля на `InputGroup` (рамка и focus-ring охватывают кнопку-глаз, чего не даёт `Input` с абсолютным позиционированием). `shadcn add --overwrite` их не тронет: таких имён в реестре нет.
- **Тёмная тема включается классом `.dark`**, а не `prefers-color-scheme`: `@custom-variant dark (&:is(.dark *))`. Класс ставит `next-themes` с `defaultTheme="system"` в `src/app/providers.tsx`, поэтому `suppressHydrationWarning` на `<html>` обязателен. Сам `next-themes` пришёл вместе с `sonner` — переключателя темы в интерфейсе нет, тема следует ОС.
- **`pagination` из реестра не используется**: он построен на ссылках `<a href>` внутри `Button asChild`, а номер страницы в `widgets/transaction-list` — состояние React, не адрес. Ссылка без адреса ломает правый клик и открытие в новой вкладке, поэтому переключатель страниц собран из `Button` внутри виджета.
- **Шрифт Geist скачивается на этапе сборки** (`next/font/google` в `layout.tsx`) с подмножеством `cyrillic` — без него русский текст рисовался бы фолбэком. `next build` без сети упадёт.
- Иконки lucide помечены `"use client"`, так что в серверных компонентах их использовать можно — они просто становятся клиентской границей. Но **компонент, полученный из вызова функции внутри рендера, запрещает правило `react-hooks/static-components`**: в `entities/category` карта иконок экспортируется как `CATEGORY_ICON_COMPONENTS`, и нужный элемент выбирается индексацией, а не функцией-фабрикой.

## Аутентификация: клиентская часть

`apps/web/src/proxy.ts` (в Next 16 middleware переименован в proxy — и файл, и имя функции) проверяет только наличие cookie, не валидность JWT: значение httpOnly недоступно. Cookie ставит API на порту 4000, но браузер не различает порты — на 3000 она видна.

Исходный путь proxy передаёт на страницу входа в `?from=`, форма возвращает пользователя туда после успеха. Значение приходит от пользователя, поэтому проходит через `safeInternalPath` (`shared/lib/redirect.ts`): всё, что не начинается с `/` — или начинается с `//` и `/\` — заменяется на дашборд, иначе получаем открытый редирект.

Формы входа и регистрации показывают текст ошибки от API как есть — 401 и 409 он отдаёт по-русски. Исключения переводит `sessionErrorMessage` (`entities/session/lib`): 429 приходит от `ThrottlerGuard` по-английски, а сорванный `fetch` — вообще не ответ сервера.

Обновление токенов и `ApiError` живут в `shared/api/client.ts` — единственной точке, через которую фронтенд ходит в API.

## Деньги

API отдаёт сумму **строкой** (в БД `Decimal(12,2)`), поэтому арифметику на клиенте не делаем — форматируем через `shared/lib/format`. Формы работают со строками из input-ов и превращают их в DTO контрактной схемой на submit: `z.coerce.number()` с ограничением двух знаков там уже есть, дублировать проверку в компоненте не нужно.

## Границы, которые легко сломать

- `next lint` в Next 16 удалён: скрипт `lint` вызывает `eslint .` напрямую.
- Алиас `@/*` есть и работает через бандлер — в отличие от `apps/api`, где только относительные импорты.
- **Версии зависимостей закреплены точно, без `^`, а CLI shadcn ставит их с кареткой** — после `shadcn add` проверьте `apps/web/package.json`.
- **`.prettierrc.json` с `prettier-plugin-tailwindcss` лежит здесь, а `pnpm format` запускается из корня.** Плагины prettier резолвятся от cwd, не от места конфига, поэтому плагин продублирован в корневых devDependencies — убрать его оттуда нельзя.
- `@tailwindcss/oxide` перечислен в `onlyBuiltDependencies` корневого `pnpm-workspace.yaml`: без этого pnpm 10 блокирует его postinstall и Tailwind не собирается.
- `AGENTS.md` рядом пишет сам `next dev` — блок `nextjs-agent-rules` восстанавливается при каждом запуске, удалять его из диффа бесполезно.
