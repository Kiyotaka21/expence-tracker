'use client';

import { CategoryForm } from '@/features/category/category-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { CategoryList } from '@/widgets/category-list';

export function CategoriesPage() {
  return (
    <>
      <PageHeader title="Категории" description="Разметьте траты по смыслу" />

      <Card>
        <CardHeader>
          <CardTitle>Новая категория</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm />
        </CardContent>
      </Card>

      <CategoryList />
    </>
  );
}
