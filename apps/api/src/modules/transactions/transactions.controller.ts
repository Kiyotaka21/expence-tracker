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
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('transactions')
@ApiCookieAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Список транзакций с фильтрами и пагинацией' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionListQueryDto,
  ): Promise<TransactionList> {
    return this.transactions.list(user.id, query);
  }

  /**
   * Объявлен до `:id`: Nest сопоставляет маршруты по порядку, и параметр
   * перехватил бы слово `summary`.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Доходы, расходы и баланс за месяц' })
  @ApiOkResponse({ type: TransactionSummaryResponseDto })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactions.summary(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Одна транзакция' })
  @ApiOkResponse({ type: TransactionResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<Transaction> {
    return this.transactions.findOne(user.id, params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавить транзакцию' })
  @ApiOkResponse({ type: TransactionResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTransactionBodyDto,
  ): Promise<Transaction> {
    return this.transactions.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить транзакцию' })
  @ApiOkResponse({ type: TransactionResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateTransactionBodyDto,
  ): Promise<Transaction> {
    return this.transactions.update(user.id, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить транзакцию' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto): Promise<void> {
    return this.transactions.remove(user.id, params.id);
  }
}
