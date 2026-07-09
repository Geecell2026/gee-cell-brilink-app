/*
  Warnings:

  - You are about to drop the column `cleoPendapatan` on the `DailyTransaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CleoTipe" AS ENUM ('PENDAPATAN', 'PENGELUARAN');

-- AlterTable
ALTER TABLE "DailyTransaction" DROP COLUMN "cleoPendapatan",
ADD COLUMN     "cleoJumlah" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cleoTipe" "CleoTipe" NOT NULL DEFAULT 'PENDAPATAN';
