import { redirect } from 'next/navigation';

import { DEFAULT_AUTHENTICATED_ROUTE } from '@/shared/config/routes';

// Точка входа: решение «дашборд или логин» принимает proxy по наличию cookie.
export default function HomePage() {
  redirect(DEFAULT_AUTHENTICATED_ROUTE);
}
