import { z } from 'zod';

/** HEX-цвет для метки категории в интерфейсе. */
export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Ожидается HEX-цвет, например #1f2937');

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(60),
  color: colorSchema.nullish(),
  icon: z.string().trim().max(40).nullish(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type Category = z.infer<typeof categorySchema>;
