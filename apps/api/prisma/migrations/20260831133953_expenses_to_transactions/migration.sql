-- Переименование, а не DROP + CREATE: в таблице есть данные, и терять их нельзя.
-- Prisma сгенерировала бы пересоздание, поэтому SQL написан вручную.
ALTER TABLE "expenses" RENAME TO "transactions";
ALTER TABLE "transactions" RENAME COLUMN "spentAt" TO "occurredAt";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_pkey" TO "transactions_pkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_userId_fkey" TO "transactions_userId_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_categoryId_fkey" TO "transactions_categoryId_fkey";
ALTER INDEX "expenses_userId_spentAt_idx" RENAME TO "transactions_userId_occurredAt_idx";
ALTER INDEX "expenses_categoryId_idx" RENAME TO "transactions_categoryId_idx";

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable: существующие строки становятся расходами за счёт умолчания.
ALTER TABLE "transactions" ADD COLUMN "type" "transaction_type" NOT NULL DEFAULT 'EXPENSE';

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");
