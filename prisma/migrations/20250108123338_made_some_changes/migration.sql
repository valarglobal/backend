/*
  Warnings:

  - You are about to drop the column `bvnHashed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `ninHashed` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "bvnHashed",
DROP COLUMN "ninHashed",
ADD COLUMN     "bvn" TEXT,
ADD COLUMN     "nin" TEXT;
