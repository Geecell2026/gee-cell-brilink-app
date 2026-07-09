import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'INPUT BIAYA EKEK'!A1:E5000`,
  });

  const rows = res.data.values ?? [];
  const headerRowIdx = rows.findIndex((r) => r.some((c) => c?.toString().toLowerCase().includes("jenis")));
  const header = rows[headerRowIdx];
  const jenisIdx = header.findIndex((h) => h?.toString().toLowerCase().includes("jenis"));
  const tokoIdx = header.findIndex((h) => h?.toString().toLowerCase().includes("toko"));
  console.log("Header row index:", headerRowIdx, "Header:", header);
  console.log("Jenis Biaya index:", jenisIdx, "Toko index:", tokoIdx);

  const categories = new Set<string>();
  const tokos = new Set<string>();
  for (const row of rows.slice(headerRowIdx + 1)) {
    if (row[jenisIdx]) categories.add(row[jenisIdx]);
    if (row[tokoIdx]) tokos.add(row[tokoIdx]);
  }
  console.log("Total baris data:", rows.length - 1);
  console.log("Unique Jenis Biaya:", Array.from(categories));
  console.log("Unique Toko:", Array.from(tokos));
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
