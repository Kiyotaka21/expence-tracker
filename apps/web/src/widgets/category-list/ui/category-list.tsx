'use client';

import { PencilIcon } from 'lucide-react';
import { useState } from 'react';

import { CategoryIcon, useCategories } from '@/entities/category';
import { CategoryForm } from '@/features/category/category-form';
import { DeleteCategoryButton } from '@/features/category/delete-category';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';

/**
 * Список категорий с инлайновым редактированием. Виджет, а не часть экрана
 * категорий: его показывают и главный экран (таб «Категории»), и страница
 * `/categories` — дублировать разметку в двух срезах `views` было бы нечем
 * оправдать.
 */
export function CategoryList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const categories = useCategories();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Категории</CardTitle>
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
  );
}
