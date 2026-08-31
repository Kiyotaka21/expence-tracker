import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface HealthResponse {
  status: 'ok';
  database: 'up';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Живость сервиса и подключения к БД' })
  async check(): Promise<HealthResponse> {
    try {
      // Запрос-константа, поэтому Unsafe-вариант здесь безопасен и не требует
      // шаблонной строки.
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      throw new ServiceUnavailableException('База данных недоступна');
    }

    return { status: 'ok', database: 'up' };
  }
}
