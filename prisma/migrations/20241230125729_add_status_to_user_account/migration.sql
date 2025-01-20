-- CreateEnum
CREATE TYPE "USER_ACCOUNT_STATUS" AS ENUM ('active', 'restricted', 'frozen');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "USER_ACCOUNT_STATUS" NOT NULL DEFAULT 'active';
