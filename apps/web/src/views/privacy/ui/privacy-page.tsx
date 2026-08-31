import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

/**
 * Заглушка под реальный документ: форма регистрации на него ссылается, поэтому
 * страница должна существовать. Юридический текст сюда подставляется отдельно.
 */
export function PrivacyPage() {
  return (
    <article className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Политика конфиденциальности</h1>

      <Alert>
        <AlertTitle>Текст документа ещё не подготовлен</AlertTitle>
        <AlertDescription>
          Это заглушка. Замените её на согласованный юридический текст до публикации сервиса.
        </AlertDescription>
      </Alert>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>Документ должен описывать как минимум:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>какие данные собираются — сейчас это email, имя и записи о расходах;</li>
          <li>основание и цели обработки, срок хранения;</li>
          <li>кому данные передаются и где размещаются;</li>
          <li>использование cookie — сервис хранит в них токены сессии;</li>
          <li>права пользователя: доступ, исправление, удаление, отзыв согласия;</li>
          <li>контакты оператора персональных данных.</li>
        </ul>
      </section>
    </article>
  );
}
