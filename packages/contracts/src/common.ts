import { z } from 'zod';

/** Параметр пути `:id` — везде UUID. */
export const idParamSchema = z.object({ id: z.uuid() });
export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Общая пагинация списков. `coerce` обязателен: query приходит строками.
 * Потолок `limit` — 100, чтобы одним запросом нельзя было вытянуть всю таблицу.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Валюты, которые понимает проект. Конвертации между ними нет. */
export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

/**
 * Сумма на входе: принимаем число или числовую строку (из query/формы),
 * ограничиваем двумя знаками — столько же хранит Decimal(12,2) в БД.
 */
export const amountInputSchema = z.coerce
  .number()
  .positive('Сумма должна быть больше нуля')
  .max(9_999_999_999)
  .multipleOf(0.01, 'Не более двух знаков после запятой');

/**
 * Сумма на выходе: строка. Prisma отдаёт Decimal, и превращать его в float
 * по пути к клиенту нельзя — потеряем точность на больших суммах.
 */
export const amountOutputSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

/**
 * Оборачивает схему элемента в схему страницы, чтобы форма ответа у всех
 * списочных ручек была одна.
 *
 * @template TItem - Схема одного элемента списка.
 * @param item - Схема элемента; подставляется в `items`.
 * @returns Схема объекта `{ items, total, page, limit }`, где `total` — количество
 * записей под фильтр, а не длина `items`.
 * @throws Исключений не бросает: это конструктор схемы, ошибки валидации возникают
 * позже, при `parse` полученной схемы.
 */
export const paginated = <TItem extends z.ZodType>(item: TItem) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  });

/** Ответ ручек, которым нечего вернуть кроме текста для пользователя. */
export const messageResponseSchema = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof messageResponseSchema>;
