import { google } from "googleapis";
import path from "path";
import { parseBranchSheet } from "./parse-branch-sheet";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";
const sheetName = process.argv[2] || "Ekek";
const skipTeller = sheetName === "CK";

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:AB3000`,
  });
  const rows = (res.data.values ?? []) as string[][];
  const parsed = parseBranchSheet(rows, skipTeller);

  console.log(`Sheet: ${sheetName}`);
  console.log(`Total baris mentah: ${rows.length - 2}, valid (bukan hantu): ${parsed.length}`);
  console.log("\n5 baris pertama:");
  parsed.slice(0, 5).forEach((r) => console.log(JSON.stringify({ ...r, date: r.date.toISOString().slice(0, 10) })));
  console.log("\n5 baris terakhir:");
  parsed.slice(-5).forEach((r) => console.log(JSON.stringify({ ...r, date: r.date.toISOString().slice(0, 10) })));

  const tellerRows = parsed.filter((r) => r.tellerName);
  console.log(`\nBaris dengan nama teller terisi: ${tellerRows.length}`);
  tellerRows.slice(0, 3).forEach((r) => console.log(JSON.stringify({ date: r.date.toISOString().slice(0, 10), tellerName: r.tellerName, tf: r.tf, eWallet: r.eWallet, itTt: r.itTt })));

  const promosiRows = parsed.filter((r) => r.brilinkPromosiLama > 0);
  console.log(`\nBaris dengan Promosi > 0 (akan jadi Biaya): ${promosiRows.length}`);
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
