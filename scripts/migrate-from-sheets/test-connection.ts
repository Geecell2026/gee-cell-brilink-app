import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY"; // REKAP LAPORAN WIL EKEK

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

  console.log("Judul spreadsheet:", res.data.properties?.title);
  console.log("Daftar sheet:");
  for (const sheet of res.data.sheets ?? []) {
    console.log(`- ${sheet.properties?.title} (sheetId: ${sheet.properties?.sheetId})`);
  }
}

main().catch((err) => {
  console.error("Gagal konek:", err.message);
  process.exit(1);
});
