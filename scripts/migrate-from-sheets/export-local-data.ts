import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const transaksi = await db.dailyTransaction.findMany({
    include: { branch: { select: { code: true } }, tellerBreakdown: true },
  });

  const biaya = await db.expenseEntry.findMany({
    include: { branch: { select: { code: true } }, category: { select: { name: true } } },
  });

  const exportData = {
    transaksi: transaksi.map((tx) => ({
      branchCode: tx.branch.code,
      date: tx.date,
      brilinkPendapatan: tx.brilinkPendapatan,
      brilinkFee: tx.brilinkFee,
      lainKeterangan: tx.lainKeterangan,
      lainPendapatan: tx.lainPendapatan,
      lainPengeluaran: tx.lainPengeluaran,
      asetKeterangan: tx.asetKeterangan,
      asetPendapatan: tx.asetPendapatan,
      asetPengeluaran: tx.asetPengeluaran,
      cleoJumlah: tx.cleoJumlah,
      cleoTipe: tx.cleoTipe,
      keteranganUmum: tx.keteranganUmum,
      operasional: tx.operasional,
      pv: tx.pv,
      gajiKasbon: tx.gajiKasbon,
      plusMinus: tx.plusMinus,
      saldoAwal: tx.saldoAwal,
      saldoAkhir: tx.saldoAkhir,
      tellerBreakdown: tx.tellerBreakdown.map((t) => ({
        tellerName: t.tellerName,
        tf: t.tf,
        eWallet: t.eWallet,
        itTt: t.itTt,
      })),
    })),
    biaya: biaya.map((b) => ({
      branchCode: b.branch.code,
      date: b.date,
      categoryName: b.category.name,
      keterangan: b.keterangan,
      totalPembayaran: b.totalPembayaran,
    })),
  };

  const outPath = path.resolve(__dirname, "local-data-export.json");
  fs.writeFileSync(outPath, JSON.stringify(exportData));
  console.log(`Export selesai: ${exportData.transaksi.length} transaksi, ${exportData.biaya.length} biaya`);
  console.log("File:", outPath);
}

main()
  .catch((err) => {
    console.error("Export gagal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
