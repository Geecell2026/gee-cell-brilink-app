import "dotenv/config";
import { google } from "googleapis";
import path from "path";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseBranchSheet } from "./parse-branch-sheet";

// Backfill khusus field brilinkPengeluaran - kolom ini ada di sheet sumber
// ("Brilink Peng") tapi tidak pernah dimigrasikan sejak migrasi historis
// pertama (parse-branch-sheet.ts sebelumnya tidak mengekstraknya sama sekali).
// Skrip ini HANYA meng-UPDATE field brilinkPengeluaran pada baris yang sudah
// ada (matched by branchId+date) - tidak membuat baris baru, tidak menyentuh
// field lain sama sekali (termasuk saldoAwal/saldoAkhir yang sudah benar).
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

function tanggalKe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const sheetsClient = await getSheetsClient();
  const onlySheet = process.argv[2];

  const branches = await db.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code, b]));

  let totalDiupdate = 0;
  let totalTidakDitemukan = 0;
  let totalNilaiNol = 0;

  for (const { sheetName, branchCode } of BRANCH_SHEETS) {
    if (onlySheet && sheetName !== onlySheet) continue;
    const branch = branchByCode.get(branchCode);
    if (!branch) {
      console.warn(`Cabang dengan code ${branchCode} tidak ditemukan, dilewati.`);
      continue;
    }

    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:AB3000`,
    });
    const rows = (res.data.values ?? []) as string[][];
    const skipTeller = branchCode === "CK";
    const parsed = parseBranchSheet(rows, skipTeller);

    // Ambil semua DailyTransaction cabang ini sekali saja, index by tanggal (YYYY-MM-DD)
    // supaya tidak query per-baris (lebih cepat & lebih ringan ke DB).
    const existingRows = await db.dailyTransaction.findMany({
      where: { branchId: branch.id },
      select: { id: true, date: true, brilinkPengeluaran: true },
    });
    const byDate = new Map(existingRows.map((r) => [tanggalKe(r.date), r]));

    let branchUpdated = 0;
    let branchNotFound = 0;
    let branchZero = 0;
    for (const p of parsed) {
      if (p.brilinkPengeluaran === 0) {
        branchZero++;
        continue;
      }
      const key = tanggalKe(p.date);
      const existing = byDate.get(key);
      if (!existing) {
        branchNotFound++;
        continue;
      }
      await db.dailyTransaction.update({
        where: { id: existing.id },
        data: { brilinkPengeluaran: p.brilinkPengeluaran },
      });
      branchUpdated++;
    }

    console.log(
      `${sheetName}: ${branchUpdated} baris di-update, ${branchNotFound} tanggal tidak ada di DB, ${branchZero} nilai 0 (dilewati)`
    );
    totalDiupdate += branchUpdated;
    totalTidakDitemukan += branchNotFound;
    totalNilaiNol += branchZero;
  }

  console.log("\n=== Ringkasan Backfill Brilink Pengeluaran ===");
  console.log("Total baris di-update:", totalDiupdate);
  console.log("Total tanggal tidak ditemukan di DB:", totalTidakDitemukan);
  console.log("Total nilai 0 (dilewati):", totalNilaiNol);
}

main()
  .catch((err) => {
    console.error("Backfill gagal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
