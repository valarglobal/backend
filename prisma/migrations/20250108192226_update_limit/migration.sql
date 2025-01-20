/*
  Warnings:

  - You are about to drop the column `dailyCreditLimit` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `dailyDebitLimit` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `singleCreditLimit` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `singleDebitLimit` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "dailyCreditLimit",
DROP COLUMN "dailyDebitLimit",
DROP COLUMN "singleCreditLimit",
DROP COLUMN "singleDebitLimit",
ADD COLUMN     "cummulativeBalanceLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dailyCummulativeTransactionLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;
