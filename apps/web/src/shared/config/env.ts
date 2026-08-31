import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

/**
 * Значение подставляется на этапе сборки, поэтому обращение к process.env
 * должно быть буквальным — без деструктуризации и динамических ключей.
 */
export const env = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
});
