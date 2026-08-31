import Link from 'next/link';

import { RegisterForm } from '@/features/auth/register';
import { ROUTES } from '@/shared/config/routes';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

interface RegisterPageProps {
  /** Путь, на который вести после регистрации. */
  redirectTo: string;
}

export function RegisterPage({ redirectTo }: RegisterPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт, чтобы вести расходы</CardDescription>
      </CardHeader>

      <CardContent>
        <RegisterForm redirectTo={redirectTo} />
      </CardContent>

      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Войти
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
