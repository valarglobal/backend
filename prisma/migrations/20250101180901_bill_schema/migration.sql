-- CreateEnum
CREATE TYPE "NETWORK" AS ENUM ('mtn', 'airtel', 'etisalat', 'glo');

-- CreateEnum
CREATE TYPE "USER_ROLE" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "USER_ROLE" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "airtimePlan" (
    "id" UUID NOT NULL,
    "network" "NETWORK",
    "countryISOCode" TEXT,
    "operatorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airtimePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataPlan" (
    "id" UUID NOT NULL,
    "network" "NETWORK",
    "countryISOCode" TEXT,
    "operatorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataPlan_pkey" PRIMARY KEY ("id")
);
