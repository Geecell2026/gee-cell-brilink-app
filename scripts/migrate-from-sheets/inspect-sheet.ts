import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";
const sheetName = process.argv[2];
const rowCount = Number(process.argv[3] ?? 5);

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:AB${rowCount}`,
  });

  for (const row of res.data.values ?? []) {
    console.log(row.join(" | "));
  }
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
