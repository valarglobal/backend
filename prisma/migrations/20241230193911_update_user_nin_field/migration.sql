-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isNinVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ninHashed" TEXT;
