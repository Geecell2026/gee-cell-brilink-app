/*
  Warnings:

  - You are about to drop the column `asetFeePermata` on the `DailyTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyTransaction" DROP COLUMN "asetFeePermata",
ADD COLUMN     "brilinkFee" DECIMAL(14,2) NOT NULL DEFAULT 0;
