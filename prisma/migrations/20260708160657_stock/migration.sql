-- CreateEnum
CREATE TYPE "StockDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PEMBELIAN', 'DISTRIBUSI', 'PENYESUAIAN');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "hpp" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "branchId" TEXT,
    "date" DATE NOT NULL,
    "direction" "StockDirection" NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2),
    "keterangan" TEXT,
    "pairId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_itemId_branchId_idx" ON "StockMovement"("itemId", "branchId");

-- CreateIndex
CREATE INDEX "StockMovement_pairId_idx" ON "StockMovement"("pairId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
