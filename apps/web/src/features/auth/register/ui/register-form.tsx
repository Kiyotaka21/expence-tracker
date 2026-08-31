'use client';

import { emailSchema, passwordSchema } from '@expence/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { sessionApi, sessionErrorMessage, sessionKeys } from '@/entities/session';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ErrorAlert } from '@/shared/ui/error-alert';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { PasswordInput } from '@/shared/ui/password-input';
import { Spinner } from '@/shared/ui/spinner';

/** Связывает чекбокс согласия с его текстом: текст служит и подписью, и описанием. */
const CONSENT_TEXT_ID = 'register-consent-text';

/**
 * Email и пароль проверяются схемами из контракта — правила те же, что на
 * сервере. Имя описано отдельно: в `registerSchema` оно `optional()` и пустую
 * строку не принимает, а незаполненный input отдаёт именно её. Пустое значение
 * превращается в `undefined` на submit.
 *
 * `consent` живёт только в форме и в контракт не входит: это условие отправки,
 * а не поле запроса — API про него ничего не знает и в БД оно не попадает.
 * `boolean().refine()`, а не `literal(true)`, чтобы тип значения остался
 * `boolean` и незаполненная форма имела валидное значение по умолчанию.
 */
const registerFormSchema = z.object({
  name: z.string().trim().max(120),
  email: emailSchema,
  password: passwordSchema,
  consent: z.boolean().refine((accepted) => accepted, {
    error: 'Без согласия зарегистрироваться нельзя',
  }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

interface RegisterFormProps {
  /** Куда вести после регистрации: проверенный путь из proxy. */
  redirectTo: string;
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '', consent: false },
  });

  const signUp = useMutation({
    mutationFn: sessionApi.register,
    onSuccess: (user) => {
      queryClient.setQueryData(sessionKeys.me, user);
      toast.success('Аккаунт создан');

      router.replace(redirectTo);
      router.refresh();
    },
  });

  const onSubmit = (values: RegisterFormValues): void => {
    signUp.mutate({
      email: values.email,
      password: values.password,
      name: values.name || undefined,
    });
  };

  const requestError = sessionErrorMessage(signUp.error);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {requestError ? <ErrorAlert message={requestError} /> : null}

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-name">Имя</FieldLabel>
              <Input
                {...field}
                id="register-name"
                autoComplete="name"
                placeholder="Как к вам обращаться"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Необязательно</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-email">Email</FieldLabel>
              <Input
                {...field}
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-password">Пароль</FieldLabel>
              <PasswordInput
                {...field}
                id="register-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Минимум 8 символов</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="consent"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              {/*
                Подпись чекбокса — сам текст согласия, поэтому вместо FieldLabel
                стоит aria-labelledby: обернуть абзац со ссылками в <label> нельзя,
                он выложил бы текст флексом и разорвал строку на куски.
              */}
              <Checkbox
                id="register-consent"
                name={field.name}
                ref={field.ref}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                aria-labelledby={CONSENT_TEXT_ID}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldDescription id={CONSENT_TEXT_ID}>
                  Я даю согласие на обработку персональных данных и принимаю{' '}
                  <Link href={ROUTES.terms} target="_blank" rel="noopener noreferrer">
                    пользовательское соглашение
                  </Link>{' '}
                  и{' '}
                  <Link href={ROUTES.privacy} target="_blank" rel="noopener noreferrer">
                    политику конфиденциальности
                  </Link>
                </FieldDescription>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </FieldContent>
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={signUp.isPending}>
          {signUp.isPending ? (
            <>
              <Spinner />
              Создаём аккаунт...
            </>
          ) : (
            'Зарегистрироваться'
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
