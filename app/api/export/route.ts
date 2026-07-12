import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hitungTotalPendapatan, hitungTotalPengeluaran } from "@/lib/calculations/transaksi";
import { getDashboardKpi, getDashboardDetailCabang } from "@/lib/calculations/dashboard";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CURRENCY_FORMAT = '"Rp"#,##0;("Rp"#,##0)';

function headerRow(sheet: ExcelJS.Worksheet, values: string[]) {
  const row = sheet.addRow(values);
  row.font = { bold: true, name: "Calibri" };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  });
  return row;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periode = req.nextUrl.searchParams.get("periode");
  const now = new Date();
  const [yearStr, monthStr] = (periode || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GEE CELL BRILink App";
  workbook.created = new Date();

  // Sheet 1: Dashboard
  const [kpi, detailCabang, karyawanPerCabang] = await Promise.all([
    getDashboardKpi({ startDate: monthStart, endDate: monthEnd, comparisonMode: "SAMA_BULAN_LALU" }),
    getDashboardDetailCabang({ startDate: monthStart, endDate: monthEnd, comparisonMode: "SAMA_BULAN_LALU" }),
    db.employee.groupBy({ by: ["branchId"], where: { isActive: true }, _count: { _all: true } }),
  ]);
  const karyawanMap = new Map(karyawanPerCabang.map((k) => [k.branchId, k._count._all]));

  const dashSheet = workbook.addWorksheet("Dashboard");
  dashSheet.addRow([`REKAP GEE CELL BRILINK - WILAYAH EKEK`]).font = { bold: true, size: 14, name: "Calibri" };
  dashSheet.addRow([`Periode: ${BULAN[month - 1]} ${year}`]);
  dashSheet.addRow([]);

  headerRow(dashSheet, ["KPI", "Nilai"]);
  const kpiRows: [string, string | number][] = [
    ["Total Cabang", kpi.totalCabang],
    ["Total Karyawan", kpi.totalKaryawan],
    ["Total Pendapatan", kpi.totalPendapatan],
    ["Total Biaya", kpi.totalBiaya],
    ["Laba Operasional", kpi.labaOperasional],
    ["Total Transaksi", kpi.totalTransaksi],
    ["Total Produk", kpi.totalItem],
    ["Total Stock", kpi.totalStock],
    ["Gaji Bulan Ini", kpi.gajiBulanIni],
  ];
  for (const [label, value] of kpiRows) {
    const row = dashSheet.addRow([label, value]);
    if (typeof value === "number" && (label.includes("Pendapatan") || label.includes("Biaya") || label.includes("Laba") || label.includes("Gaji"))) {
      row.getCell(2).numFmt = CURRENCY_FORMAT;
    }
  }
  dashSheet.addRow([]);

  headerRow(dashSheet, ["Cabang", "Pendapatan", "Biaya", "Laba", "Total Transaksi", "Karyawan", "Status"]);
  for (const row of detailCabang) {
    const r = dashSheet.addRow([
      row.branchName, row.pendapatan, row.biaya, row.laba, row.totalTransaksi,
      karyawanMap.get(row.branchId) ?? 0, row.status,
    ]);
    r.getCell(2).numFmt = CURRENCY_FORMAT;
    r.getCell(3).numFmt = CURRENCY_FORMAT;
    r.getCell(4).numFmt = CURRENCY_FORMAT;
  }
  dashSheet.columns.forEach((col) => (col.width = 20));

  // Sheet 2: Transaksi Harian
  const transaksi = await db.dailyTransaction.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    include: { branch: true },
    orderBy: [{ date: "asc" }, { branch: { name: "asc" } }],
  });

  const txSheet = workbook.addWorksheet("Transaksi Harian");
  headerRow(txSheet, [
    "Tanggal", "Cabang", "Brilink/Atm Mini Pendapatan Adm", "Brilink/Atm Mini Fee", "Brilink/Atm Mini Pengeluaran",
    "Lain Pendapatan", "Lain Pengeluaran", "Aset Pendapatan", "Aset Pengeluaran",
    "Cleo Pendapatan", "Cleo Pengeluaran", "Operasional", "PV", "Gaji/Kasbon", "Plus Minus",
    "Saldo Awal", "Saldo Akhir", "Total Pendapatan", "Total Pengeluaran",
  ]);
  for (const tx of transaksi) {
    const cleoPendapatan = tx.cleoTipe === "PENDAPATAN" ? Number(tx.cleoJumlah) : 0;
    const cleoPengeluaran = tx.cleoTipe === "PENGELUARAN" ? Number(tx.cleoJumlah) : 0;
    const r = txSheet.addRow([
      tx.date, tx.branch.name,
      Number(tx.brilinkPendapatan), Number(tx.brilinkFee), Number(tx.brilinkPengeluaran),
      Number(tx.lainPendapatan), Number(tx.lainPengeluaran), Number(tx.asetPendapatan), Number(tx.asetPengeluaran),
      cleoPendapatan, cleoPengeluaran, Number(tx.operasional), Number(tx.pv), Number(tx.gajiKasbon), Number(tx.plusMinus),
      Number(tx.saldoAwal), Number(tx.saldoAkhir), hitungTotalPendapatan(tx), hitungTotalPengeluaran(tx),
    ]);
    r.getCell(1).numFmt = "dd/mm/yyyy";
    for (let c = 3; c <= 19; c++) r.getCell(c).numFmt = CURRENCY_FORMAT;
  }
  txSheet.columns.forEach((col) => (col.width = 16));

  // Sheet 3: Biaya
  const biaya = await db.expenseEntry.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    include: { branch: true, category: true },
    orderBy: [{ date: "asc" }],
  });

  const biayaSheet = workbook.addWorksheet("Biaya");
  headerRow(biayaSheet, ["Tanggal", "Cabang", "Jenis Biaya", "Keterangan", "Jumlah"]);
  for (const b of biaya) {
    const r = biayaSheet.addRow([b.date, b.branch.name, b.category.name, b.keterangan, Number(b.totalPembayaran)]);
    r.getCell(1).numFmt = "dd/mm/yyyy";
    r.getCell(5).numFmt = CURRENCY_FORMAT;
  }
  biayaSheet.columns.forEach((col) => (col.width = 20));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Rekap_GEE_CELL_${BULAN[month - 1]}_${year}.xlsx"`,
    },
  });
}
