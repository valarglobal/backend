/*
  Warnings:

  - You are about to drop the `Beneficiary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Beneficiary" DROP CONSTRAINT "Beneficiary_userId_fkey";

-- DropTable
DROP TABLE "Beneficiary";

-- CreateTable
CREATE TABLE "beneficiary" (
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

    CONSTRAINT "beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_userId_key" ON "beneficiary"("userId");

-- AddForeignKey
ALTER TABLE "beneficiary" ADD CONSTRAINT "beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
