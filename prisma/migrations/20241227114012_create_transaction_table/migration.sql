-- CreateEnum
CREATE TYPE "TRANSACTION_TYPE" AS ENUM ('BILL_PAYMENT', 'INTERBANK_TRANSFER');

-- CreateEnum
CREATE TYPE "TRANSACTION_STATUS" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "transactionRef" TEXT,
    "type" "TRANSACTION_TYPE" NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "TRANSACTION_STATUS" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "previousBalance" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "billDetails" JSONB NOT NULL,
    "transferDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_walletId_key" ON "transaction"("walletId");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
