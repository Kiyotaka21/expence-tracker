import { z } from 'zod';

export const emailSchema = z.email('Некорректный email').max(254).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Пароль короче 8 символов')
  .max(128, 'Пароль длиннее 128 символов');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль'),
});
export type LoginDto = z.infer<typeof loginSchema>;

/** Публичное представление пользователя — без хеша пароля. */
export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

/**
 * Тело JWT. Токены ходят в httpOnly cookie, поэтому клиенту эта схема нужна
 * только для типизации — сам payload он не читает.
 */
export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  /** Идентификатор refresh-сессии; есть только в refresh-токене. */
  sid: z.uuid().optional(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
