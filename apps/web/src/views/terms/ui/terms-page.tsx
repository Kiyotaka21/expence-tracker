import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

/**
 * Заглушка под реальный документ: форма регистрации на него ссылается, поэтому
 * страница должна существовать. Юридический текст сюда подставляется отдельно.
 */
export function TermsPage() {
  return (
    <article className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Пользовательское соглашение</h1>

      <Alert>
        <AlertTitle>Текст документа ещё не подготовлен</AlertTitle>
        <AlertDescription>
          Это заглушка. Замените её на согласованный юридический текст до публикации сервиса.
        </AlertDescription>
      </Alert>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>Документ должен описывать как минимум:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>предмет соглашения и то, какие услуги оказывает сервис;</li>
          <li>порядок регистрации, требования к учётной записи и её блокировке;</li>
          <li>права и обязанности пользователя и владельца сервиса;</li>
          <li>ограничение ответственности и условия доступности сервиса;</li>
          <li>порядок изменения соглашения и способ уведомления о правках;</li>
          <li>контакты для обращений и применимое право.</li>
        </ul>
      </section>
    </article>
  );
}
