-- CreateTable
CREATE TABLE "cablePlan" (
    "id" UUID NOT NULL,
    "planName" TEXT,
    "countryISOCode" TEXT,
    "billerCode" TEXT,
    "description" TEXT,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cablePlan_pkey" PRIMARY KEY ("id")
);
