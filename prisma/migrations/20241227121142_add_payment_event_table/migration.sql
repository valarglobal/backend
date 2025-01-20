-- CreateTable
CREATE TABLE "paymentEvent" (
    "id" UUID NOT NULL,
    "refId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT,
    "reference" TEXT,
    "amountPaid" TEXT NOT NULL,
    "settlementAmount" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymentEvent_pkey" PRIMARY KEY ("id")
);
