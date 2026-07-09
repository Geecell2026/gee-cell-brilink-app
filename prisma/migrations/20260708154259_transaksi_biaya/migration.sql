-- CreateTable
CREATE TABLE "DailyTransaction" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "brilinkPendapatan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "brilinkPengeluaran" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "brilinkPromosi" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lainKeterangan" TEXT,
    "lainPendapatan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lainPengeluaran" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "asetKeterangan" TEXT,
    "asetFeePermata" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "asetPendapatan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "asetPengeluaran" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cleoPendapatan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "keteranganUmum" TEXT,
    "operasional" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pv" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gajiKasbon" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "plusMinus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoAwal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoAkhir" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionTellerBreakdown" (
    "id" TEXT NOT NULL,
    "dailyTransactionId" TEXT NOT NULL,
    "tellerName" TEXT NOT NULL,
    "tf" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "eWallet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "itTt" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "TransactionTellerBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "totalPembayaran" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTransaction_branchId_date_idx" ON "DailyTransaction"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTransaction_branchId_date_key" ON "DailyTransaction"("branchId", "date");

-- CreateIndex
CREATE INDEX "TransactionTellerBreakdown_dailyTransactionId_idx" ON "TransactionTellerBreakdown"("dailyTransactionId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_branchId_date_idx" ON "ExpenseEntry"("branchId", "date");

-- AddForeignKey
ALTER TABLE "DailyTransaction" ADD CONSTRAINT "DailyTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTellerBreakdown" ADD CONSTRAINT "TransactionTellerBreakdown_dailyTransactionId_fkey" FOREIGN KEY ("dailyTransactionId") REFERENCES "DailyTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
