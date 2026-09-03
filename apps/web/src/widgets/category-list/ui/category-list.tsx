'use client';

import { PencilIcon } from 'lucide-react';
import { useState } from 'react';

import { CategoryIcon, useCategories } from '@/entities/category';
import { CategoryForm } from '@/features/category/category-form';
import { DeleteCategoryButton } from '@/features/category/delete-category';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Плитка под иконку красится цветом самой категории — тем же, что стоит у неё
 * в списке операций и в кольце расходов. Цвет приходит из БД и проверен
 * контрактом как `#rrggbb`, поэтому прозрачность дописывается к нему хвостом.
 */
const tileStyle = (color: string | null): React.CSSProperties | undefined =>
  color ? { backgroundColor: color + '1f' } : undefined;

/**
 * Список категорий с инлайновым редактированием. Виджет, а не часть экрана
 * категорий: его показывают и страница `/categories`, и формы операций через
 * общий кэш сущности.
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
        {categories.error ? <ErrorAlert message={categories.error.message} /> : null}

        {categories.isPending ? (
          <div className="space-y-4 py-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {categories.data?.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Пока ни одной категории. Добавьте первую — она появится в формах и фильтрах.
          </p>
        ) : null}

        {categories.data && categories.data.length > 0 ? (
          <ul>
            {categories.data.map((category) => (
              <li key={category.id} className="border-b border-border py-3 last:border-0">
                {editingId === category.id ? (
                  <CategoryForm category={category} onDone={() => setEditingId(null)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"
                      style={tileStyle(category.color)}
                    >
                      <CategoryIcon slug={category.icon} color={category.color} />
                    </span>

                    <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>

                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={'Изменить категорию ' + category.name}
                      onClick={() => setEditingId(category.id)}
                    >
                      <PencilIcon />
                      <span className="hidden sm:inline">Изменить</span>
                    </Button>
                    <DeleteCategoryButton id={category.id} name={category.name} />
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
