/*
  Warnings:

  - You are about to alter the column `balance` on the `wallet` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "wallet" ALTER COLUMN "balance" SET DATA TYPE DOUBLE PRECISION;
