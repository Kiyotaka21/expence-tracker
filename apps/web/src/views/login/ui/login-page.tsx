import Link from 'next/link';

import { LoginForm } from '@/features/auth/login';
import { ROUTES } from '@/shared/config/routes';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

interface LoginPageProps {
  /** Путь, на который вернуться после входа. */
  redirectTo: string;
}

export function LoginPage({ redirectTo }: LoginPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Вход</CardTitle>
        <CardDescription>Учёт расходов начинается здесь</CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm redirectTo={redirectTo} />
      </CardContent>

      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
