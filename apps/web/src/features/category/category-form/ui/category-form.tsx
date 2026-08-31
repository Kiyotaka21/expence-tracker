'use client';

import { createCategorySchema, type Category, type CreateCategoryDto } from '@expence/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  CATEGORY_ICONS,
  CATEGORY_ICON_LABELS,
  categoryApi,
  categoryKeys,
} from '@/entities/category';
import { transactionKeys } from '@/entities/transaction';
import { ApiError } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Spinner } from '@/shared/ui/spinner';

const DEFAULT_COLOR = '#2563eb';

/**
 * Форма работает со строками из input-ов, а в DTO они превращаются через
 * контракт createCategorySchema — валидация остаётся одна для клиента и сервера.
 * `noColor` — только UI-флаг: контракт разрешает color === null, и без явного
 * переключателя пустое значение из `input type="color"` не получить.
 */
const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(60),
  color: z.string(),
  icon: z.string(),
  noColor: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const toFormValues = (category?: Category): CategoryFormValues => ({
  name: category?.name ?? '',
  color: category?.color ?? DEFAULT_COLOR,
  icon: category?.icon ?? '',
  noColor: category ? category.color === null : false,
});

/** 409 приходит с общим текстом фильтра — про уникальность имени он не знает. */
const errorText = (error: Error | null): string | null => {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 409) {
    return 'Категория с таким названием уже есть';
  }

  return error.message;
};

interface CategoryFormProps {
  /** Без категории — создание, с категорией — правка. */
  category?: Category;
  onDone?: () => void;
}

export function CategoryForm({ category, onDone }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const [contractError, setContractError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  });

  // useWatch, а не watch(): React Compiler не может мемоизировать функцию,
  // которую возвращает useForm, и пропускает компиляцию компонента.
  const noColor = useWatch({ control, name: 'noColor' });

  const save = useMutation({
    mutationFn: (dto: CreateCategoryDto) =>
      category ? categoryApi.update(category.id, dto) : categoryApi.create(dto),
    onSuccess: async () => {
      toast.success(category ? 'Категория сохранена' : 'Категория добавлена');

      // Расход отдаёт вложенный category.name, поэтому кэш расходов тоже
      // устаревает после переименования.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);

      if (category) {
        onDone?.();
      } else {
        reset(toFormValues());
      }
    },
  });

  const onSubmit = (values: CategoryFormValues): void => {
    const parsed = createCategorySchema.safeParse({
      name: values.name,
      color: values.noColor ? null : values.color,
      icon: values.icon || null,
    });

    if (!parsed.success) {
      setContractError(parsed.error.issues[0]?.message ?? 'Проверьте введённые данные');
      return;
    }

    setContractError(null);
    save.mutate(parsed.data);
  };

  const requestError = errorText(save.error);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {contractError ? <ErrorAlert message={contractError} /> : null}
        {requestError ? <ErrorAlert message={requestError} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!formState.errors.name}>
            <FieldLabel htmlFor="category-name">Название</FieldLabel>
            <Input
              id="category-name"
              placeholder="Например, Продукты"
              aria-invalid={!!formState.errors.name}
              {...register('name')}
            />
            <FieldError errors={[formState.errors.name]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="category-icon">Иконка</FieldLabel>
            <NativeSelect id="category-icon" {...register('icon')}>
              <NativeSelectOption value="">Без иконки</NativeSelectOption>
              {CATEGORY_ICONS.map((slug) => (
                <NativeSelectOption key={slug} value={slug}>
                  {CATEGORY_ICON_LABELS[slug]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="category-color">Цвет</FieldLabel>
          <div className="flex items-center gap-3">
            <Input
              id="category-color"
              type="color"
              className="w-16 px-1"
              disabled={noColor}
              {...register('color')}
            />

            <Controller
              name="noColor"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="category-no-color"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <Label htmlFor="category-no-color" className="font-normal">
                    Без цвета
                  </Label>
                </div>
              )}
            />
          </div>
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Spinner /> : null}
            {category ? 'Сохранить' : 'Добавить категорию'}
          </Button>

          {onDone ? (
            <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
              Отмена
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
