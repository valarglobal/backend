-- CreateEnum
CREATE TYPE "BENEFICIARY_TYPE" AS ENUM ('TRANSFER', 'BILL');

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "BENEFICIARY_TYPE" NOT NULL,
    "bankName" TEXT,
    "bankCode" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "network" "NETWORK",
    "billerNumber" TEXT,
    "operatorId" INTEGER,
    "billerCode" TEXT,
    "itemCode" TEXT,
    "currency" "CURRENCY" DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_userId_key" ON "Beneficiary"("userId");

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
