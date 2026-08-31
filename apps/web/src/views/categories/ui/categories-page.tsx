'use client';

import { PencilIcon } from 'lucide-react';
import { useState } from 'react';

import { CategoryIcon, useCategories } from '@/entities/category';
import { CategoryForm } from '@/features/category/category-form';
import { DeleteCategoryButton } from '@/features/category/delete-category';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';

export function CategoriesPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const categories = useCategories();

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

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {categories.isPending ? (
            <p className="text-sm text-muted-foreground">Загружаем...</p>
          ) : null}
          {categories.error ? <ErrorAlert message={categories.error.message} /> : null}

          {categories.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока ни одной категории</p>
          ) : null}

          {categories.data && categories.data.length > 0 ? (
            <ul className="divide-y">
              {categories.data.map((category) => (
                <li key={category.id} className="py-3">
                  {editingId === category.id ? (
                    <CategoryForm category={category} onDone={() => setEditingId(null)} />
                  ) : (
                    <div className="flex items-center gap-3">
                      <CategoryIcon slug={category.icon} color={category.color} />
                      <span className="flex-1 text-sm font-medium">{category.name}</span>

                      <Button variant="ghost" size="sm" onClick={() => setEditingId(category.id)}>
                        <PencilIcon />
                        Изменить
                      </Button>
                      <DeleteCategoryButton id={category.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
