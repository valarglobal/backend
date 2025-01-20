-- CreateTable
CREATE TABLE "internetservicePlan" (
    "id" UUID NOT NULL,
    "planName" TEXT,
    "countryISOCode" TEXT,
    "billerCode" TEXT,
    "description" TEXT,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internetservicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportPlan" (
    "id" UUID NOT NULL,
    "planName" TEXT,
    "countryISOCode" TEXT,
    "billerCode" TEXT,
    "description" TEXT,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schoolfeePlan" (
    "id" UUID NOT NULL,
    "planName" TEXT,
    "countryISOCode" TEXT,
    "billerCode" TEXT,
    "description" TEXT,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schoolfeePlan_pkey" PRIMARY KEY ("id")
);
