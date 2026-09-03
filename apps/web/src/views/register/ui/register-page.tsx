import Link from 'next/link';

import { RegisterForm } from '@/features/auth/register';
import { ROUTES } from '@/shared/config/routes';

interface RegisterPageProps {
  /** Путь, на который вести после регистрации. */
  redirectTo: string;
}

export function RegisterPage({ redirectTo }: RegisterPageProps) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-2xl leading-tight font-extrabold">Регистрация</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Создайте аккаунт, чтобы вести расходы
        </p>
      </div>

      <RegisterForm redirectTo={redirectTo} />

      <p className="text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
