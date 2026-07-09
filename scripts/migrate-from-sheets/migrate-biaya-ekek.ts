import "dotenv/config";
import { google } from "googleapis";
import path from "path";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseRupiah, parseTanggalDDMMYYYY } from "./lib";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";

// Nama kategori di sheet lama tidak selalu persis sama dengan nama di database baru.
const CATEGORY_NAME_MAP: Record<string, string> = {
  "B. PROMOSI": "BIAYA PROMOSI",
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const branch = await db.branch.findUnique({ where: { code: "EKEK" } });
  if (!branch) throw new Error("Cabang EKEK tidak ditemukan");

  const categories = await db.expenseCategory.findMany();
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'INPUT BIAYA EKEK'!A1:E5000`,
  });
  const rows = (res.data.values ?? []) as string[][];
  // Header sesungguhnya ada di baris ke-2 (baris ke-1 kosong).
  const dataRows = rows.slice(2);

  let created = 0;
  let skippedNoAmount = 0;
  let skippedUnknownCategory = 0;
  let errors = 0;
  const unknownCategories = new Set<string>();

  for (const row of dataRows) {
    const [tanggalStr, , keteranganBiaya, totalStr, jenisBiayaRaw] = row;
    const date = parseTanggalDDMMYYYY(tanggalStr);
    const amount = parseRupiah(totalStr);
    if (!date || amount <= 0) {
      skippedNoAmount++;
      continue;
    }

    const jenisBiaya = (jenisBiayaRaw ?? "").toString().trim();
    const mappedName = CATEGORY_NAME_MAP[jenisBiaya] ?? jenisBiaya;
    const category = categoryByName.get(mappedName);
    if (!category) {
      skippedUnknownCategory++;
      unknownCategories.add(jenisBiaya);
      continue;
    }

    try {
      await db.expenseEntry.create({
        data: {
          branchId: branch.id,
          date,
          categoryId: category.id,
          keterangan: (keteranganBiaya ?? "").toString().trim() || "-",
          totalPembayaran: amount,
        },
      });
      created++;
    } catch (err) {
      errors++;
      console.error(`Gagal baris tanggal ${tanggalStr}:`, (err as Error).message);
    }
  }

  console.log("=== Ringkasan Migrasi Biaya Ekek ===");
  console.log("Total baris mentah:", dataRows.length);
  console.log("Biaya baru dibuat:", created);
  console.log("Dilewati (tanpa tanggal/jumlah valid):", skippedNoAmount);
  console.log("Dilewati (kategori tidak dikenal):", skippedUnknownCategory);
  if (unknownCategories.size > 0) console.log("Kategori tidak dikenal:", Array.from(unknownCategories));
  console.log("Error:", errors);
}

main()
  .catch((err) => {
    console.error("Migrasi gagal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
