import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@expence/contracts';

import { api } from '@/shared/api/client';

export const categoryApi = {
  list: () => api.get<Category[]>('/categories'),
  create: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto),
  update: (id: string, dto: UpdateCategoryDto) => api.patch<Category>('/categories/' + id, dto),
  remove: (id: string) => api.delete<void>('/categories/' + id),
};

export const categoryKeys = {
  all: ['categories'] as const,
};
