-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PAID');

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "gajiPokokSnapshot" DECIMAL(14,2) NOT NULL,
    "hariEfektifKerja" INTEGER NOT NULL,
    "totalMasuk" INTEGER NOT NULL,
    "hariLembur" INTEGER NOT NULL,
    "gajiPerHari" DECIMAL(14,2) NOT NULL,
    "gajiPokokProrata" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gajiLembur" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "uangMakan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "thr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalKasbonDipotong" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalGajiKotor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sisaGaji" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchSalaryClaim" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payingBranchId" TEXT NOT NULL,
    "owingBranchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "keterangan" TEXT,
    "isReimbursed" BOOLEAN NOT NULL DEFAULT false,
    "reimbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchSalaryClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_periodYear_periodMonth_key" ON "Payroll"("employeeId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchSalaryClaim" ADD CONSTRAINT "BranchSalaryClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchSalaryClaim" ADD CONSTRAINT "BranchSalaryClaim_payingBranchId_fkey" FOREIGN KEY ("payingBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchSalaryClaim" ADD CONSTRAINT "BranchSalaryClaim_owingBranchId_fkey" FOREIGN KEY ("owingBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
