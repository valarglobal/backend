-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "billDetails" DROP NOT NULL,
ALTER COLUMN "transferDetails" DROP NOT NULL;
