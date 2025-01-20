-- CreateEnum
CREATE TYPE "BILL_TYPE" AS ENUM ('data', 'airtime');

-- AlterTable
ALTER TABLE "airtimePlan" ADD COLUMN     "planName" TEXT;

-- AlterTable
ALTER TABLE "dataPlan" ADD COLUMN     "planName" TEXT;
