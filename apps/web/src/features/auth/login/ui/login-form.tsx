'use client';

import { loginSchema, type LoginDto } from '@expence/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { sessionApi, sessionErrorMessage, sessionKeys } from '@/entities/session';
import { Button } from '@/shared/ui/button';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { PasswordInput } from '@/shared/ui/password-input';
import { Spinner } from '@/shared/ui/spinner';

interface LoginFormProps {
  /** Куда вернуть пользователя после входа: проверенный путь из proxy. */
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: sessionApi.login,
    onSuccess: (user) => {
      // Ответ входа — тот же AuthUser, что отдаёт /auth/me: кладём его в кэш,
      // чтобы шапка не ходила за профилем повторно.
      queryClient.setQueryData(sessionKeys.me, user);
      toast.success('С возвращением, ' + (user.name ?? user.email));

      router.replace(redirectTo);
      router.refresh();
    },
  });

  const requestError = sessionErrorMessage(login.error);

  return (
    <form onSubmit={form.handleSubmit((values) => login.mutate(values))} noValidate>
      <FieldGroup>
        {requestError ? <ErrorAlert message={requestError} /> : null}

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
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
              <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
              <PasswordInput
                {...field}
                id="login-password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? (
            <>
              <Spinner />
              Входим...
            </>
          ) : (
            'Войти'
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
