import { ApiError } from '@/shared/api/client';

/**
 * Текст ошибки для форм входа и регистрации.
 *
 * Сообщения 401/409 API отдаёт по-русски и их видно показывать как есть,
 * а два случая своего текста не имеют: 429 приходит от ThrottlerGuard
 * англоязычным, а сорванный fetch — вообще не ответ сервера.
 */
export const sessionErrorMessage = (error: Error | null): string | null => {
  if (!error) return null;

  if (!(error instanceof ApiError)) {
    return 'Не удалось связаться с сервером. Проверьте подключение';
  }

  if (error.status === 429) {
    return 'Слишком много попыток. Повторите через минуту';
  }

  return error.message;
};
