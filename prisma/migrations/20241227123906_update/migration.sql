/*
  Warnings:

  - Changed the type of `amountPaid` on the `paymentEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `settlementAmount` on the `paymentEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "paymentEvent" DROP COLUMN "amountPaid",
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL,
DROP COLUMN "settlementAmount",
ADD COLUMN     "settlementAmount" DOUBLE PRECISION NOT NULL;
