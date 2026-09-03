'use client';

import { CURRENCIES, TRANSACTION_TYPES, createTransactionSchema } from '@expence/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCategories } from '@/entities/category';
import { TRANSACTION_TYPE_LABELS, transactionApi, transactionKeys } from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Spinner } from '@/shared/ui/spinner';

/**
 * Форма работает со строками (их отдают input-ы), а в DTO превращается через
 * контракт createTransactionSchema: валидация остаётся одна для клиента и сервера.
 */
const transactionFormSchema = z.object({
  amount: z.string().min(1, 'Введите сумму'),
  type: z.enum(TRANSACTION_TYPES),
  currency: z.enum(CURRENCIES),
  categoryId: z.string(),
  occurredAt: z.string().min(1, 'Укажите дату'),
  note: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): TransactionFormValues => ({
  amount: '',
  type: 'EXPENSE',
  currency: 'RUB',
  categoryId: '',
  occurredAt: today(),
  note: '',
});

interface TransactionFormProps {
  /**
   * Вызывается после успешного сохранения и по кнопке «Отмена». Нужен тому, кто
   * показывает форму в диалоге: закрыть его может только владелец состояния.
   * Без него формы просто нет кнопки отмены — на странице отменять нечего.
   */
  onDone?: () => void;
}

export function TransactionForm({ onDone }: TransactionFormProps) {
  const queryClient = useQueryClient();
  const [contractError, setContractError] = useState<string | null>(null);

  // Список категорий берём из кэша сущности: тот же ключ, что и у страницы
  // категорий, поэтому лишнего запроса не будет.
  const categories = useCategories();

  const { register, handleSubmit, reset, formState } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: emptyForm(),
  });

  const create = useMutation({
    mutationFn: transactionApi.create,
    onSuccess: async () => {
      toast.success('Операция добавлена');
      reset(emptyForm());
      onDone?.();
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });

  const onSubmit = (values: TransactionFormValues): void => {
    const parsed = createTransactionSchema.safeParse({
      amount: values.amount.replace(',', '.'),
      type: values.type,
      currency: values.currency,
      categoryId: values.categoryId || null,
      occurredAt: new Date(values.occurredAt).toISOString(),
      note: values.note || null,
    });

    if (!parsed.success) {
      setContractError(parsed.error.issues[0]?.message ?? 'Проверьте введённые данные');
      return;
    }

    setContractError(null);
    create.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {contractError ? <ErrorAlert message={contractError} /> : null}
        {create.error ? <ErrorAlert message={create.error.message} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="transaction-type">Тип</FieldLabel>
            <NativeSelect id="transaction-type" {...register('type')}>
              {TRANSACTION_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {TRANSACTION_TYPE_LABELS[type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field data-invalid={!!formState.errors.amount}>
            <FieldLabel htmlFor="transaction-amount">Сумма</FieldLabel>
            <Input
              id="transaction-amount"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={!!formState.errors.amount}
              {...register('amount')}
            />
            <FieldError errors={[formState.errors.amount]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="transaction-currency">Валюта</FieldLabel>
            <NativeSelect id="transaction-currency" {...register('currency')}>
              {CURRENCIES.map((currency) => (
                <NativeSelectOption key={currency} value={currency}>
                  {currency}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="transaction-category">Категория</FieldLabel>
            <NativeSelect
              id="transaction-category"
              disabled={categories.isPending}
              {...register('categoryId')}
            >
              <NativeSelectOption value="">Без категории</NativeSelectOption>
              {(categories.data ?? []).map((category) => (
                <NativeSelectOption key={category.id} value={category.id}>
                  {category.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field data-invalid={!!formState.errors.occurredAt}>
            <FieldLabel htmlFor="transaction-occurred-at">Дата</FieldLabel>
            <Input
              id="transaction-occurred-at"
              type="date"
              aria-invalid={!!formState.errors.occurredAt}
              {...register('occurredAt')}
            />
            <FieldError errors={[formState.errors.occurredAt]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="transaction-note">Комментарий</FieldLabel>
          <Input id="transaction-note" placeholder="Необязательно" {...register('note')} />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner /> : null}
            Добавить
          </Button>

          {onDone ? (
            <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>
              Отмена
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
