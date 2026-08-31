import {
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
  Catch,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Код ошибки Prisma без импорта из сгенерированного клиента: путь к нему
 * меняется между версиями, а форма ошибки (`code: 'P2002'`) стабильна.
 */
function prismaErrorCode(exception: unknown): string | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const code = (exception as { code?: unknown }).code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    switch (prismaErrorCode(exception)) {
      case 'P2002':
        super.catch(new ConflictException('Запись с такими данными уже существует'), host);
        return;
      case 'P2025':
        super.catch(new NotFoundException('Запись не найдена'), host);
        return;
      default:
        break;
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }

    super.catch(exception, host);
  }
}
