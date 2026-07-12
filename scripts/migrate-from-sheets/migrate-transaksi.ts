import "dotenv/config";
import { google } from "googleapis";
import path from "path";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseBranchSheet } from "./parse-branch-sheet";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";

const BRANCH_SHEETS: { sheetName: string; branchCode: string }[] = [
  { sheetName: "Ekek", branchCode: "EKEK" },
  { sheetName: "AB", branchCode: "AB" },
  { sheetName: "AB2", branchCode: "AB2" },
  { sheetName: "PARAMON", branchCode: "PARAMON" },
  { sheetName: "RCKH", branchCode: "RCKH" },
  { sheetName: "SAMSAT", branchCode: "SAMSAT" },
  { sheetName: "SJ", branchCode: "SJ" },
  { sheetName: "PERMATA BIRU", branchCode: "PERMATA_BIRU" },
  { sheetName: "PASEH", branchCode: "PASEH" },
  { sheetName: "CK", branchCode: "CK" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

async function main() {
  const sheetsClient = await getSheetsClient();
  const onlySheet = process.argv[2]; // opsional: batasi ke 1 sheet untuk tes

  const branches = await db.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code, b]));

  const promosiCategory = await db.expenseCategory.findUnique({ where: { name: "BIAYA PROMOSI" } });
  if (!promosiCategory) throw new Error("Kategori BIAYA PROMOSI tidak ditemukan, jalankan seed dulu");

  let totalTx = 0;
  let totalTeller = 0;
  let totalPromosiBiaya = 0;
  let totalSkipped = 0;
  let totalError = 0;

  for (const { sheetName, branchCode } of BRANCH_SHEETS) {
    if (onlySheet && sheetName !== onlySheet) continue;
    const branch = branchByCode.get(branchCode);
    if (!branch) {
      console.warn(`Cabang dengan code ${branchCode} tidak ditemukan di database, dilewati.`);
      continue;
    }

    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:AB3000`,
    });
    const rows = (res.data.values ?? []) as string[][];
    const skipTeller = branchCode === "CK";

    const parsed = parseBranchSheet(rows, skipTeller);
    console.log(`\n${sheetName}: memproses ${parsed.length} baris valid...`);

    let branchTx = 0;
    for (const p of parsed) {
      try {
        const existing = await db.dailyTransaction.findUnique({
          where: { branchId_date: { branchId: branch.id, date: p.date } },
        });
        if (existing) {
          totalSkipped++;
          continue;
        }

        const created = await db.dailyTransaction.create({
          data: {
            branchId: branch.id,
            date: p.date,
            brilinkPendapatan: p.brilinkPendapatan,
            brilinkFee: p.brilinkFee,
            brilinkPengeluaran: p.brilinkPengeluaran,
            lainKeterangan: p.lainKeterangan || null,
            lainPendapatan: p.lainPendapatan,
            lainPengeluaran: p.lainPengeluaran,
            asetKeterangan: p.asetKeterangan || null,
            asetPendapatan: p.asetPendapatan,
            asetPengeluaran: p.asetPengeluaran,
            cleoJumlah: p.cleoJumlah,
            cleoTipe: "PENDAPATAN",
            keteranganUmum: p.keteranganUmum || null,
            operasional: p.operasional,
            pv: p.pv,
            gajiKasbon: p.gajiKasbon,
            plusMinus: p.plusMinus,
            saldoAwal: p.saldoAwal,
            saldoAkhir: p.saldoAkhir,
          },
        });
        totalTx++;
        branchTx++;

        if (p.tellerName && (p.tf || p.eWallet || p.itTt)) {
          await db.transactionTellerBreakdown.create({
            data: {
              dailyTransactionId: created.id,
              tellerName: p.tellerName,
              tf: p.tf,
              eWallet: p.eWallet,
              itTt: p.itTt,
            },
          });
          totalTeller++;
        }

        if (p.brilinkPromosiLama > 0) {
          await db.expenseEntry.create({
            data: {
              branchId: branch.id,
              date: p.date,
              categoryId: promosiCategory.id,
              keterangan: "Migrasi dari data lama (Brilink Promosi)",
              totalPembayaran: p.brilinkPromosiLama,
            },
          });
          totalPromosiBiaya++;
        }
      } catch (err) {
        totalError++;
        console.error(`  Gagal ${sheetName} ${p.date.toISOString().slice(0, 10)}:`, (err as Error).message);
      }
    }
    console.log(`  -> ${branchTx} transaksi baru dibuat untuk ${sheetName}`);
  }

  console.log("\n=== Ringkasan Migrasi Transaksi Harian ===");
  console.log("Transaksi baru dibuat:", totalTx);
  console.log("Breakdown teller dibuat:", totalTeller);
  console.log("Biaya Promosi dimigrasikan:", totalPromosiBiaya);
  console.log("Dilewati (sudah ada):", totalSkipped);
  console.log("Error:", totalError);
}

main()
  .catch((err) => {
    console.error("Migrasi gagal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
