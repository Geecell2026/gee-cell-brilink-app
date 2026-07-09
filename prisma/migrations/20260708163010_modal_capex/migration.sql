-- CreateEnum
CREATE TYPE "CapexCategory" AS ENUM ('RENOVASI', 'SEWA', 'PERLENGKAPAN', 'LAINNYA');

-- CreateTable
CREATE TABLE "CapexEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "hargaSatuan" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "category" "CapexCategory" NOT NULL DEFAULT 'LAINNYA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapexEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterPersonLoan" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromPerson" TEXT NOT NULL,
    "toPerson" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "keterangan" TEXT,
    "branchId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterPersonLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapexEntry_branchId_date_idx" ON "CapexEntry"("branchId", "date");

-- AddForeignKey
ALTER TABLE "CapexEntry" ADD CONSTRAINT "CapexEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterPersonLoan" ADD CONSTRAINT "InterPersonLoan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
