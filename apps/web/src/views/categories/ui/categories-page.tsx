'use client';

import { CategoryForm } from '@/features/category/category-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CategoryList } from '@/widgets/category-list';

export function CategoriesPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Категории</h1>
        <p className="text-sm text-muted-foreground">Разметьте траты по смыслу</p>
      </div>

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
