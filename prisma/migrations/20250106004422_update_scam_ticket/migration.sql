/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `scamTicket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `scamTicket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scamTicket" ADD COLUMN     "userId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scamTicket_userId_key" ON "scamTicket"("userId");

-- AddForeignKey
ALTER TABLE "scamTicket" ADD CONSTRAINT "scamTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
