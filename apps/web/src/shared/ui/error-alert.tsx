import { TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertTitle } from '@/shared/ui/alert';

/** Ошибка запроса над формой или списком: один текст, без описания и действий. */
export function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{message}</AlertTitle>
    </Alert>
  );
}
