-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "statusSangatBaik" DECIMAL(14,2) NOT NULL DEFAULT 30000000,
    "statusBaik" DECIMAL(14,2) NOT NULL DEFAULT 15000000,
    "statusPerluPerhatian" DECIMAL(14,2) NOT NULL DEFAULT 5000000,
    "stockKritisThreshold" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
