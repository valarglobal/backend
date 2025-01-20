/*
  Warnings:

  - You are about to drop the column `referralCode` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `referredBy` on the `Wallet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "referralCode",
DROP COLUMN "referredBy";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredBy" TEXT;
