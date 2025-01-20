/*
  Warnings:

  - A unique constraint covering the columns `[accountNumber]` on the table `wallet` will be added. If there are existing duplicate values, this will fail.
  - Made the column `accountNumber` on table `wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "wallet" ALTER COLUMN "accountNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accountNumber_key" ON "wallet"("accountNumber");
