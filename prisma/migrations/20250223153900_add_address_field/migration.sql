-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "isAddressVerified" BOOLEAN NOT NULL DEFAULT false;
