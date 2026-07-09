/*
  Warnings:

  - You are about to drop the column `brilinkPengeluaran` on the `DailyTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `brilinkPromosi` on the `DailyTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyTransaction" DROP COLUMN "brilinkPengeluaran",
DROP COLUMN "brilinkPromosi";
