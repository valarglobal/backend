-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bvnHashed" TEXT,
ADD COLUMN     "isBvnVerified" BOOLEAN NOT NULL DEFAULT false;
