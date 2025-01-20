-- CreateEnum
CREATE TYPE "SCAM_TICKET_STATUS" AS ENUM ('opened', 'closed');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "scamTicketCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "scamTicket" (
    "id" UUID NOT NULL,
    "ref_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "screenshotImageUrl" TEXT NOT NULL,
    "status" "SCAM_TICKET_STATUS" NOT NULL DEFAULT 'opened',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scamTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scamTicket_ref_number_idx" ON "scamTicket"("ref_number");
