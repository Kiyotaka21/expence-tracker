import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Transaction, TransactionList, TransactionSummary } from '@expence/contracts';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionBodyDto,
  IdParamDto,
  TransactionListQueryDto,
  TransactionListResponseDto,
  TransactionResponseDto,
  TransactionSummaryQueryDto,
  TransactionSummaryResponseDto,
  UpdateTransactionBodyDto,
} from './dto';

/**
 * HTTP-слой транзакций: маршруты `/api/transactions`. Логики здесь нет — методы
 * только достают пользователя из запроса и зовут `TransactionsService`.
 *
 * Общее для всех обработчиков (отрабатывает до тела метода, поэтому в `@throws`
 * отдельных методов не повторяется, а в Swagger объявлено декораторами класса):
 *
 * - `JwtAuthGuard` зарегистрирован глобально, `@Public()` тут нет — без валидной
 *   access-cookie приходит `UnauthorizedException` (401);
 * - `ThrottlerGuard` отдаёт 429 после 120 запросов в минуту с адреса;
 * - `@Body`/`@Query`/`@Param` проверяет глобальный `ZodValidationPipe` по схемам
 *   из `@expence/contracts`; невалидный запрос — `ZodValidationException`,
 *   наследник `BadRequestException` (400). У методов это описано там, где схема
 *   делает больше, чем проверку типов.
 *
 * Тела запросов, query и path-параметры в Swagger руками не описаны: их отдаёт
 * `createZodDto`. Схемы ответов-ошибок тоже нет — Nest отдаёт свою
 * (`statusCode`, `message`, `error`), в контракте она не описана, поэтому у
 * `@Api*Response` только описания.
 */
@ApiTags('transactions')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Нет валидной access-cookie' })
@ApiTooManyRequestsResponse({ description: 'Больше 120 запросов в минуту с адреса' })
@Controller('transactions')
export class TransactionsController {
  /** @param transactions - Сервис с бизнес-логикой модуля. */
  constructor(private readonly transactions: TransactionsService) {}

  /**
   * `GET /api/transactions` — страница транзакций текущего пользователя.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param query - Пагинация и фильтры; `page`/`limit` без значений — 1 и 20.
   * @returns Промис со страницей транзакций (`items`, `total`, `page`, `limit`), 200.
   * @throws {BadRequestException} 400 — `limit` больше 100, неверный UUID категории,
   * `from`/`to` не ISO-датой или `type` вне `INCOME | EXPENSE`.
   */
  @Get()
  @ApiOperation({ summary: 'Список транзакций с фильтрами и пагинацией' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  @ApiBadRequestResponse({
    description:
      'limit больше 100, неверный UUID категории, from/to не ISO-датой или неверный type',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionListQueryDto,
  ): Promise<TransactionList> {
    return this.transactions.list(user.id, query);
  }

  /**
   * `GET /api/transactions/summary` — доходы, расходы и баланс за месяц.
   *
   * Объявлен до `:id`: Nest сопоставляет маршруты по порядку, и параметр
   * перехватил бы слово `summary`.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param query - Обязательные `month` (1–12) и `year` (2000–2100), валюта по
   * умолчанию `RUB`.
   * @returns Промис со сводкой за месяц, 200.
   * @throws {BadRequestException} 400 — `month`/`year` не переданы либо вне диапазона,
   * валюта вне `RUB | USD | EUR`.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Доходы, расходы и баланс за месяц' })
  @ApiOkResponse({ type: TransactionSummaryResponseDto })
  @ApiBadRequestResponse({
    description: 'month/year не переданы либо вне диапазона, валюта вне RUB | USD | EUR',
  })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactions.summary(user.id, query);
  }

  /**
   * `GET /api/transactions/:id` — одна транзакция.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param params - Параметры пути: `id` транзакции.
   * @returns Промис с транзакцией, 200.
   * @throws {BadRequestException} 400 — `id` не UUID.
   * @throws {NotFoundException} 404 — транзакции нет либо она принадлежит другому
   * пользователю.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Одна транзакция' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'id не UUID' })
  @ApiNotFoundResponse({ description: 'Транзакции нет либо она принадлежит другому пользователю' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<Transaction> {
    return this.transactions.findOne(user.id, params.id);
  }

  /**
   * `POST /api/transactions` — добавить транзакцию.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param body - Сумма (обязательна), тип, валюта, категория, дата операции, заметка.
   * @returns Промис с созданной транзакцией, 201.
   * @throws {BadRequestException} 400 — сумма не положительная, больше двух знаков
   * после запятой или заметка длиннее 500 символов; а также «Категория не найдена»,
   * если `categoryId` указывает на чужую или несуществующую категорию.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавить транзакцию' })
  // Именно ApiCreatedResponse: с ApiOkResponse в доке появлялся лишний пустой 201,
  // который @nestjs/swagger добавляет для @Post по умолчанию.
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Сумма не положительная, больше двух знаков после запятой, заметка длиннее 500 символов ' +
      'или категория не найдена',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTransactionBodyDto,
  ): Promise<Transaction> {
    return this.transactions.create(user.id, body);
  }

  /**
   * `PATCH /api/transactions/:id` — изменить транзакцию.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param params - Параметры пути: `id` транзакции.
   * @param body - Только изменяемые поля; непереданные остаются как были.
   * @returns Промис с обновлённой транзакцией, 200.
   * @throws {BadRequestException} 400 — `id` не UUID, поля тела не проходят схему
   * либо «Категория не найдена» для чужого или несуществующего `categoryId`.
   * @throws {NotFoundException} 404 — транзакции нет либо она чужая.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Изменить транзакцию' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description: 'id не UUID, поля тела не проходят схему либо категория не найдена',
  })
  @ApiNotFoundResponse({ description: 'Транзакции нет либо она принадлежит другому пользователю' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateTransactionBodyDto,
  ): Promise<Transaction> {
    return this.transactions.update(user.id, params.id, body);
  }

  /**
   * `DELETE /api/transactions/:id` — удалить транзакцию.
   *
   * @param user - Владелец запроса, из access-токена.
   * @param params - Параметры пути: `id` транзакции.
   * @returns Промис без значения: ответ 204 без тела.
   * @throws {BadRequestException} 400 — `id` не UUID.
   * @throws {NotFoundException} 404 — транзакции нет, она чужая или уже удалена.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить транзакцию' })
  // Без этого в доке остался бы дефолтный 200: тела у ответа нет, код — 204.
  @ApiNoContentResponse({ description: 'Транзакция удалена' })
  @ApiBadRequestResponse({ description: 'id не UUID' })
  @ApiNotFoundResponse({ description: 'Транзакции нет, она чужая или уже удалена' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto): Promise<void> {
    return this.transactions.remove(user.id, params.id);
  }
}
