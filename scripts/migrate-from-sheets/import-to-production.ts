import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const dataPath = path.resolve(__dirname, "local-data-export.json");
  const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const branches = await db.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code, b.id]));
  const categories = await db.expenseCategory.findMany();
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  let txCreated = 0;
  let txSkipped = 0;
  let tellerCreated = 0;
  let biayaCreated = 0;
  let errors = 0;

  for (const tx of raw.transaksi) {
    const branchId = branchByCode.get(tx.branchCode);
    if (!branchId) {
      console.warn(`Cabang ${tx.branchCode} tidak ditemukan di production, dilewati`);
      continue;
    }

    const date = new Date(tx.date);
    try {
      const existing = await db.dailyTransaction.findUnique({
        where: { branchId_date: { branchId, date } },
      });
      if (existing) {
        txSkipped++;
        continue;
      }

      const created = await db.dailyTransaction.create({
        data: {
          branchId,
          date,
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
          tellerBreakdown: {
            create: tx.tellerBreakdown.map((t: { tellerName: string; tf: number; eWallet: number; itTt: number }) => ({
              tellerName: t.tellerName,
              tf: t.tf,
              eWallet: t.eWallet,
              itTt: t.itTt,
            })),
          },
        },
      });
      txCreated++;
      tellerCreated += tx.tellerBreakdown.length;
    } catch (err) {
      errors++;
      console.error(`Gagal transaksi ${tx.branchCode} ${tx.date}:`, (err as Error).message);
    }
  }

  for (const b of raw.biaya) {
    const branchId = branchByCode.get(b.branchCode);
    const categoryId = categoryByName.get(b.categoryName);
    if (!branchId || !categoryId) {
      console.warn(`Cabang/kategori tidak ditemukan untuk biaya: ${b.branchCode} / ${b.categoryName}`);
      continue;
    }
    try {
      await db.expenseEntry.create({
        data: {
          branchId,
          date: new Date(b.date),
          categoryId,
          keterangan: b.keterangan,
          totalPembayaran: b.totalPembayaran,
        },
      });
      biayaCreated++;
    } catch (err) {
      errors++;
      console.error(`Gagal biaya ${b.branchCode} ${b.date}:`, (err as Error).message);
    }
  }

  console.log("\n=== Ringkasan Import ke Production ===");
  console.log("Transaksi baru:", txCreated);
  console.log("Teller breakdown baru:", tellerCreated);
  console.log("Biaya baru:", biayaCreated);
  console.log("Transaksi dilewati (sudah ada):", txSkipped);
  console.log("Error:", errors);
}

main()
  .catch((err) => {
    console.error("Import gagal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
