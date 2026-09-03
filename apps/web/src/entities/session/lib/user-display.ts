import type { AuthUser } from '@expence/contracts';

/**
 * Имя для интерфейса. В контракте `name` необязателен, поэтому подписи в шапке
 * и в карточке профиля падают на email — иначе на месте имени была бы пустота.
 */
export const userDisplayName = (user: AuthUser | undefined): string =>
  user?.name?.trim() || user?.email || '';

/**
 * Инициалы для аватара: первые буквы двух слов имени, иначе первая буква email.
 * Загрузки аватарок в проекте нет, картинку взять негде — `Avatar` всегда
 * показывает fallback, и он не должен быть пустым.
 */
export const userInitials = (user: AuthUser | undefined): string => {
  const name = user?.name?.trim();

  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] ?? '')
      .join('')
      .toUpperCase();
  }

  return (user?.email?.[0] ?? '?').toUpperCase();
};

/**
 * Короткое обращение для приветствия: первое слово имени, иначе часть email
 * до собачки. Полное имя в заголовок не годится — «Привет, Иван Петров-Водкин»
 * ломает строку на любом кегле.
 */
export const userFirstName = (user: AuthUser | undefined): string => {
  const name = user?.name?.trim();

  if (name) {
    return name.split(/\s+/)[0] ?? name;
  }

  return user?.email?.split('@')[0] ?? '';
};
