import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = "1XS3vF0cGseoMvyAMWvmpTNWIADOVyEMSVm7AQX7-yMY";
const BRANCH_SHEETS = ["Ekek", "AB", "AB2", "PARAMON", "RCKH", "SAMSAT", "SJ", "PERMATA BIRU", "PASEH", "CK"];

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, "../../secrets/google-service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  for (const name of BRANCH_SHEETS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${name}'!A1:AB2`,
    });
    console.log(`=== ${name} ===`);
    console.log("R1:", res.data.values?.[0]);
    console.log("R2:", res.data.values?.[1]);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
