'use client';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';

/**
 * Поле пароля с переключателем видимости.
 *
 * Собрано из InputGroup, а не из Input с абсолютно позиционированной кнопкой:
 * рамка и focus-ring тогда рисуются вокруг всей группы, включая кнопку.
 * `aria-invalid` прокидывается на сам input — по нему группа красит рамку.
 */
export function PasswordInput(props: ComponentProps<typeof InputGroupInput>) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput type={visible ? 'text' : 'password'} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
