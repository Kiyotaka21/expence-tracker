# Категории трат: веб-интерфейс

## Context

Запрос был «добавить сущность категории (id, имя, цвет, иконка, userId), сервис с методами
создания / поиска всех категорий пользователя / обновления / удаления и защищённый гвардом
контроллер с валидацией». Проверка показала, что **весь бэкенд категорий уже реализован**
и переписывать его не нужно:

- `Category` с `id`, `userId`, `name`, `color`, `icon`, `createdAt`, `updatedAt` —
  [schema.prisma:30-45](apps/api/prisma/schema.prisma#L30-L45), в БД через миграцию `init`,
  с `@@unique([userId, name])` и `@@index([userId])`;
- [categories.service.ts](apps/api/src/modules/categories/categories.service.ts) — все четыре
  метода (`list`, `create`, `update`, `remove`) плюс приватный `ensureOwned`: обращение к чужому
  id даёт 404, а не 403, поэтому существование чужой категории не утекает;
- [categories.controller.ts](apps/api/src/modules/categories/categories.controller.ts) —
  `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`,
  `DELETE /api/categories/:id`, со Swagger-аннотациями;
- защита — `JwtAuthGuard` зарегистрирован глобально как `APP_GUARD` в
  [app.module.ts:30](apps/api/src/app.module.ts#L30); на контроллере нет `@Public()`, значит все
  четыре маршрута требуют access-токен;
- валидация — zod-схемы в [packages/contracts/src/category.ts](packages/contracts/src/category.ts)
  → `createZodDto` в [dto.ts](apps/api/src/modules/categories/dto.ts) → глобальный
  `ZodValidationPipe`;
- конфликт по `@@unique([userId, name])` уже превращается в 409 глобальным
  [all-exceptions.filter.ts:27](apps/api/src/common/filters/all-exceptions.filter.ts#L27).

Реально не сделан только фронтенд: страницы категорий нет, в `categoriesApi` нет `update`,
в навигации нет ссылки. Управлять категориями из интерфейса нельзя — они появляются
исключительно через `pnpm db:seed`. Итог задачи: страница `/categories` с полным CRUD.

## Решения по объёму

- **Валидация остаётся на zod, class-validator не вводим.** В запросе он назван, но в проекте
  не установлен, а zod-схемы из `packages/contracts` — единственный источник правды: из них же
  выводится Swagger и `zodResolver` в формах Next (см. «Контракт API» в [CLAUDE.md](CLAUDE.md)).
  class-validator продублировал бы правила валидации в двух местах и вывел категории из общего
  контракта — формы на вебе потеряли бы общую с бэкендом схему.
- **`userId` наружу не отдаём.** В БД он есть, но
  [category.mapper.ts](apps/api/src/modules/categories/category.mapper.ts) его отбрасывает: все
  категории в ответе и так принадлежат текущему пользователю, а фильтрация по владельцу целиком
  на сервере.
- **Иконки — свой набор без новой зависимости.** В сидах лежат lucide-слаги
  (`shopping-cart`, `bus`, `home`, `ticket`, `heart-pulse`), но библиотеки иконок в `apps/web` нет.
  Заводим свою карту слаг → inline-SVG вместо `lucide-react`: пакет всё равно потребовал бы ручную
  карту (иначе поиск иконки по имени тянет в бандл весь набор).
- **Изменений в `packages/contracts`, `apps/api` и в схеме БД не требуется** — значит не нужны
  ни миграция, ни `db:generate`, ни пересборка контрактов.

## Шаг 1. `categoriesApi.update` — дописать в клиент

Правка в [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts): в `categoriesApi` есть
`list`/`create`/`remove`, нет `update`. `api.patch` в
[api-client.ts:100](apps/web/src/lib/api-client.ts#L100) уже есть, добавить нечего кроме метода:

```ts
update: (id: string, dto: UpdateCategoryDto) => api.patch<Category>('/categories/' + id, dto),
```

`UpdateCategoryDto` — в существующий импорт типов из `@expence/contracts`.
`queryKeys.categories` уже объявлен, трогать не нужно.

## Шаг 2. `CategoryIcon` — новый компонент

Создать `apps/web/src/components/ui/category-icon.tsx`.

- `CATEGORY_ICONS: readonly string[]` — 12 слагов, обязательно включая все пять из
  [seed.ts:11-17](apps/api/prisma/seed.ts#L11-L17) (`shopping-cart`, `bus`, `home`, `ticket`,
  `heart-pulse`), плюс `wallet`, `utensils`, `gift`, `plane`, `book`, `dumbbell`, `phone`.
  Экспортируется — из этого же списка строится `<Select>` в форме, чтобы список иконок и список
  опций не разъезжались.
- `<CategoryIcon slug={...} color={...} />` — inline-SVG 24×24, `stroke="currentColor"`,
  `strokeWidth={2}`, цвет через `style={{ color }}`. Пути рисуем сами простой геометрией
  в том же стиле — чтобы не тащить path-данные из lucide и не разбираться с их лицензией.
- Неизвестный слаг или `null` → цветная точка-заглушка. Обязательно: в БД могут лежать значения
  вне нашего набора (сиды, старые записи), и вёрстка на них ломаться не должна.

Компонент серверный, `'use client'` не нужен — он без состояния, как остальные файлы в `ui/`.

## Шаг 3. `CategoryForm` — новый компонент

Создать `apps/web/src/components/forms/category-form.tsx`. Один компонент на создание и правку:
`{ category?: Category; onDone?: () => void }` — без `category` режим создания, с ним режим правки.

Повторяем ровно тот паттерн, что в
[expense-form.tsx:20-73](apps/web/src/components/forms/expense-form.tsx#L20-L73): react-hook-form
работает со строками из input-ов, а в DTO они превращаются через контрактную схему на submit,
с отдельным состоянием `contractError`.

```ts
const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(60),
  color: z.string(),
  icon: z.string(),
  noColor: z.boolean(),
});
```

На submit собираем `{ name, color: values.noColor ? null : values.color, icon: values.icon || null }`
и прогоняем через `createCategorySchema.safeParse` — **в обоих режимах**: форма всегда отправляет
все три поля, а `updateCategorySchema` это `createCategorySchema.partial()`, поэтому результат
присваивается и в `CreateCategoryDto`, и в `UpdateCategoryDto`.

Контролы:

- **Название** — `Input`.
- **Цвет** — `Input type="color"` (даёт ровно `#rrggbb`, что и требует `colorSchema` в
  [category.ts:4](packages/contracts/src/category.ts#L4), поэтому невалидный ввод невозможен)
  - чекбокс «Без цвета», при котором picker блокируется и уходит `null`. Контракт разрешает
    `nullish`, столбец в БД nullable — интерфейс должен уметь и то и другое.
- **Иконка** — `Select` по `CATEGORY_ICONS` с пустой опцией «Без иконки» → `null`. Пустая опция
  как nullable-значение — тот же приём, что для `categoryId` в
  [expense-form.tsx:105](apps/web/src/components/forms/expense-form.tsx#L105).

Две мутации (`categoriesApi.create` / `categoriesApi.update`) выбираются по наличию `category`.
В `onSuccess`:

- `reset()` в режиме создания, `onDone()` в режиме правки;
- инвалидация `queryKeys.categories`;
- **инвалидация `['expenses']` тоже** — расход отдаёт вложенный `category.name`
  ([expenses/page.tsx:68](<apps/web/src/app/(dashboard)/expenses/page.tsx#L68>)), и без этого после
  переименования кэш расходов держит старое имя.

Ошибки: 409 приходит с общим текстом «Запись с такими данными уже существует» (фильтр один на все
модели и про уникальность имени категории не знает). В форме перехватываем `ApiError`
(экспортируется из [api-client.ts:3](apps/web/src/lib/api-client.ts#L3)) со `status === 409`
и показываем «Категория с таким названием уже есть», иначе `error.message`. Вывод — через
существующий `Alert`.

## Шаг 4. Страница `/categories` — новый файл

Создать `apps/web/src/app/(dashboard)/categories/page.tsx`. `'use client'`, структура и состояния
копируют [expenses/page.tsx](<apps/web/src/app/(dashboard)/expenses/page.tsx>):

- заголовок + подпись;
- `Card` «Новая категория» с `<CategoryForm />`;
- `Card` «Список»: `useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.list })`,
  состояния `isPending` / `error` / пустой список — теми же формулировками, что на странице
  расходов;
- строка списка: `<CategoryIcon>`, название, кнопки «Изменить» и «Удалить» (`variant="ghost"`,
  красная — как удаление расхода);
- правка — локальный `useState<string | null>(editingId)`: строка заменяется на
  `<CategoryForm category={...} onDone={() => setEditingId(null)} />` с кнопкой «Отмена»;
- удаление — через `window.confirm` с предупреждением, что расходы останутся, но без категории:
  у `Expense.categoryId` стоит `onDelete: SetNull`
  ([schema.prisma:59](apps/api/prisma/schema.prisma#L59)), так что удаление категории расходы
  не трёт. Мутация инвалидирует и `['categories']`, и `['expenses']`.

## Шаг 5. Ссылка в навигации

В `NAV_LINKS` ([app-header.tsx:10-13](apps/web/src/components/app-header.tsx#L10-L13)) добавить
`{ href: '/categories', label: 'Категории' }`.

Доступ уже закрыт и настраивать нечего: matcher в [proxy.ts:39](apps/web/src/proxy.ts#L39)
покрывает все маршруты, а страница лежит в группе `(dashboard)`, поэтому layout с `AppHeader`
подхватится сам.

## Файлы

| Файл                                                                             | Что                    |
| -------------------------------------------------------------------------------- | ---------------------- |
| `apps/web/src/components/ui/category-icon.tsx`                                   | новый                  |
| `apps/web/src/components/forms/category-form.tsx`                                | новый                  |
| `apps/web/src/app/(dashboard)/categories/page.tsx`                               | новый                  |
| [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)                               | `categoriesApi.update` |
| [apps/web/src/components/app-header.tsx](apps/web/src/components/app-header.tsx) | ссылка в `NAV_LINKS`   |

`packages/contracts`, `apps/api`, `schema.prisma` и миграции — **не трогаем**.

## Чеклист реализации

**Шаг 1 — клиент API**

- [x] В [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts) добавить `UpdateCategoryDto` в импорт типов
- [x] Добавить `update: (id, dto) => api.patch<Category>('/categories/' + id, dto)` в `categoriesApi`

**Шаг 2 — `CategoryIcon`**

- [x] Создать `apps/web/src/components/ui/category-icon.tsx`
- [x] Экспортировать `CATEGORY_ICONS` — 12 слагов, включая все 5 из сидов
- [x] Написать inline-SVG 24×24 (`currentColor`, `strokeWidth={2}`) для каждого слага
- [x] Fallback-точка для неизвестного слага и для `null`

**Шаг 3 — `CategoryForm`**

- [x] Создать `apps/web/src/components/forms/category-form.tsx` с пропсами `{ category?, onDone? }`
- [x] `categoryFormSchema` (`name` / `color` / `icon` / `noColor`) + `zodResolver`
- [x] Submit собирает DTO и прогоняет через `createCategorySchema.safeParse`, ошибку в `contractError`
- [x] Поле «Название» — `Input`
- [x] Поле «Цвет» — `Input type="color"` + чекбокс «Без цвета» (блокирует picker, отправляет `null`)
- [x] Поле «Иконка» — `Select` по `CATEGORY_ICONS` + пустая опция «Без иконки» → `null`
- [x] Две мутации `create`/`update`, выбор по наличию `category`
- [x] `onSuccess`: `reset()` либо `onDone()`, инвалидация `['categories']` **и** `['expenses']`
- [x] 409 через `ApiError.status` → «Категория с таким названием уже есть», иначе `error.message`

**Шаг 4 — страница**

- [x] Создать `apps/web/src/app/(dashboard)/categories/page.tsx` (`'use client'`)
- [x] Заголовок + `Card` «Новая категория» с `<CategoryForm />`
- [x] `Card` «Список» с `useQuery` и состояниями `isPending` / `error` / пусто
- [x] Строка: `<CategoryIcon>`, название, кнопки «Изменить» / «Удалить»
- [x] `editingId` в `useState`, строка подменяется формой правки с кнопкой «Отмена»
- [x] Удаление: `window.confirm` с предупреждением про расходы, инвалидация обоих кэшей

**Шаг 5 — навигация**

- [x] `{ href: '/categories', label: 'Категории' }` в `NAV_LINKS`

**Проверка**

- [x] `pnpm lint && pnpm typecheck` проходят
- [x] Сквозной прогон по сценариям ниже

### Отклонения от плана при реализации

- **Одна мутация вместо двух.** Вместо двух объектов `useMutation` — один с ветвлением в
  `mutationFn`: `category ? categoriesApi.update(category.id, dto) : categoriesApi.create(dto)`.
  Выбор по наличию `category` сохранён, но не нужен guard на `category` внутри update-мутации.
- **`useWatch` вместо `watch()`.** `watch()` из `useForm` даёт предупреждение
  `react-hooks/incompatible-library`: React Compiler не может мемоизировать возвращаемую функцию
  и пропускает компиляцию всего компонента. `useWatch({ control, name: 'noColor' })` этого
  не вызывает.

## Проверка

```bash
docker compose up -d
pnpm db:seed          # демо-пользователь + 5 категорий
pnpm dev
```

Вход как `demo@expence.local` / `demo12345`, дальше на `/categories`:

1. **Список** — видны 5 категорий из сидов, у всех отрисованы иконки (слаги сидов входят
   в `CATEGORY_ICONS`) и цвета.
2. **Создание** — новая категория появляется в списке без перезагрузки.
3. **Дубликат** — создать категорию с именем «Продукты»: ожидаем «Категория с таким названием
   уже есть» (409 от `@@unique([userId, name])`), а не общий текст фильтра и не 500.
4. **Правка** — переименовать категорию, у которой есть расход; на `/expenses` в колонке
   «Категория» должно стоять новое имя. Это проверяет инвалидацию `['expenses']`.
5. **Nullable-поля** — сохранить категорию с «Без цвета» и «Без иконки»: сохраняется, в списке
   рисуется заглушка.
6. **Удаление** — удалить категорию с расходом; категория исчезает, расход на `/expenses`
   остаётся со «—» в колонке категории (это и подтверждает `onDelete: SetNull`).
7. **Guard** — `curl -i http://localhost:4000/api/categories` без cookie → 401. Swagger на
   http://localhost:4000/api/docs показывает все четыре маршрута под тегом `categories`;
   состав схем не должен измениться, контракты мы не трогали.

```bash
pnpm lint && pnpm typecheck   # оба должны пройти по всем пакетам
```

Тестового раннера в репозитории нет (решение осознанное, см. [CLAUDE.md](CLAUDE.md)) —
проверка ручная.

## Осознанно не делаем

- **class-validator** — см. «Решения по объёму». Если он всё-таки нужен, это отдельная задача
  с переносом валидации категорий из общего контракта, и формы на вебе придётся отвязать
  от `createCategorySchema`.
- **`CategoriesRepository`** — `CategoriesService` продолжает ходить в `PrismaService` напрямую.
  Слой репозитория есть только у users; неоднородность зафиксирована в [CLAUDE.md](CLAUDE.md)
  как осознанная. Образец для будущего выноса —
  [users.repository.ts](apps/api/src/modules/users/users.repository.ts).
- **`GET /categories/:id`** — в запросе не было, форме правки не нужен: категория уже есть
  в загруженном списке.
- **`userId` в ответе API** — см. «Решения по объёму».
- **Счётчик расходов и сумма по категории** — это аналитика, её в проекте пока нет вообще.
- **Сортировка и поиск по категориям** — бэкенд отдаёт список по `name asc`, при текущих объёмах
  этого достаточно.
