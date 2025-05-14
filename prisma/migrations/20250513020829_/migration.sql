-- CreateEnum
CREATE TYPE "GENDER" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "COUNTRY" AS ENUM ('NG', 'GH', 'ZA', 'US');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" "COUNTRY",
ADD COLUMN     "gender" "GENDER";
