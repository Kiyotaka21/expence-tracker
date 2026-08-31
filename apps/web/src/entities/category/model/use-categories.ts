'use client';

import { useQuery } from '@tanstack/react-query';

import { categoryApi, categoryKeys } from '../api/category-api';

export const useCategories = () =>
  useQuery({ queryKey: categoryKeys.all, queryFn: categoryApi.list });
