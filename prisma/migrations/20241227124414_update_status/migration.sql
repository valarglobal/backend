/*
  Warnings:

  - The values [INTERBANK_TRANSFER] on the enum `TRANSACTION_TYPE` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TRANSACTION_TYPE_new" AS ENUM ('BILL_PAYMENT', 'TRANSFER', 'DEPOSIT');
ALTER TABLE "transaction" ALTER COLUMN "type" TYPE "TRANSACTION_TYPE_new" USING ("type"::text::"TRANSACTION_TYPE_new");
ALTER TYPE "TRANSACTION_TYPE" RENAME TO "TRANSACTION_TYPE_old";
ALTER TYPE "TRANSACTION_TYPE_new" RENAME TO "TRANSACTION_TYPE";
DROP TYPE "TRANSACTION_TYPE_old";
COMMIT;
