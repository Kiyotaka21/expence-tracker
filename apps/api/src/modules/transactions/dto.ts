import {
  createTransactionSchema,
  idParamSchema,
  transactionListQuerySchema,
  transactionListSchema,
  transactionSchema,
  transactionSummaryQuerySchema,
  transactionSummarySchema,
  updateTransactionSchema,
} from '@expence/contracts';
import { createZodDto } from 'nestjs-zod';

export class IdParamDto extends createZodDto(idParamSchema) {}
export class CreateTransactionBodyDto extends createZodDto(createTransactionSchema) {}
export class UpdateTransactionBodyDto extends createZodDto(updateTransactionSchema) {}
export class TransactionListQueryDto extends createZodDto(transactionListQuerySchema) {}
export class TransactionSummaryQueryDto extends createZodDto(transactionSummaryQuerySchema) {}
export class TransactionResponseDto extends createZodDto(transactionSchema) {}
export class TransactionListResponseDto extends createZodDto(transactionListSchema) {}
export class TransactionSummaryResponseDto extends createZodDto(transactionSummarySchema) {}
