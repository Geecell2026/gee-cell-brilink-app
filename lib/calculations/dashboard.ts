import { db } from "@/lib/db";
import { hitungTotalPendapatan } from "@/lib/calculations/transaksi";
import { hitungStockLevels } from "@/lib/calculations/stock";
import { getAppSettings } from "@/lib/calculations/settings";

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export async function getKpiSummary(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [totalCabang, totalKaryawan, transaksiBulanIni, itemCount, levels, payrollBulanIni] =
    await Promise.all([
      db.branch.count({ where: { isActive: true } }),
      db.employee.count({ where: { isActive: true } }),
      db.dailyTransaction.findMany({ where: { date: { gte: monthStart, lt: monthEnd } } }),
      db.item.count({ where: { isActive: true } }),
      hitungStockLevels(),
      db.payroll.aggregate({
        where: { periodYear: year, periodMonth: month },
        _sum: { totalGajiKotor: true },
      }),
    ]);

  const omsetBulanIni = transaksiBulanIni.reduce((sum, tx) => sum + hitungTotalPendapatan(tx), 0);
  const totalStock = levels.reduce((sum, l) => sum + l.qty, 0);

  return {
    totalCabang,
    totalKaryawan,
    omsetBulanIni,
    totalItem: itemCount,
    totalStock,
    gajiBulanIni: Number(payrollBulanIni._sum.totalGajiKotor ?? 0),
  };
}

export async function getTrendOmsetBulanan(bulanTerakhir = 6) {
  const now = new Date();
  const result: { bulan: string; omset: number }[] = [];

  for (let i = bulanTerakhir - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const transaksi = await db.dailyTransaction.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
    });
    const omset = transaksi.reduce((sum, tx) => sum + hitungTotalPendapatan(tx), 0);

    result.push({ bulan: `${BULAN_SINGKAT[month - 1]} ${year}`, omset });
  }

  return result;
}

export type StatusCabang = "Sangat Baik" | "Baik" | "Perlu Perhatian" | "Rendah";

function tentukanStatus(
  omset: number,
  thresholds: { sangatBaik: number; baik: number; perluPerhatian: number }
): StatusCabang {
  if (omset >= thresholds.sangatBaik) return "Sangat Baik";
  if (omset >= thresholds.baik) return "Baik";
  if (omset >= thresholds.perluPerhatian) return "Perlu Perhatian";
  return "Rendah";
}

export async function getDetailPerCabang(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [branches, settings] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getAppSettings(),
  ]);
  const thresholds = {
    sangatBaik: Number(settings.statusSangatBaik),
    baik: Number(settings.statusBaik),
    perluPerhatian: Number(settings.statusPerluPerhatian),
  };

  const rows = await Promise.all(
    branches.map(async (branch) => {
      const [transaksi, karyawanCount] = await Promise.all([
        db.dailyTransaction.findMany({ where: { branchId: branch.id, date: { gte: monthStart, lt: monthEnd } } }),
        db.employee.count({ where: { branchId: branch.id, isActive: true } }),
      ]);
      const omset = transaksi.reduce((sum, tx) => sum + hitungTotalPendapatan(tx), 0);

      return {
        branchId: branch.id,
        branchName: branch.name,
        omset,
        transaksi: transaksi.length,
        karyawan: karyawanCount,
        status: tentukanStatus(omset, thresholds),
      };
    })
  );

  return rows.sort((a, b) => b.omset - a.omset);
}

export async function getStockKritis(threshold?: number) {
  const [items, levels, settings] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    hitungStockLevels(),
    getAppSettings(),
  ]);
  const effectiveThreshold = threshold ?? settings.stockKritisThreshold;

  const totalPerItem = new Map<string, number>();
  for (const level of levels) {
    totalPerItem.set(level.itemId, (totalPerItem.get(level.itemId) ?? 0) + level.qty);
  }

  return items
    .map((item) => ({ itemId: item.id, name: item.name, total: totalPerItem.get(item.id) ?? 0 }))
    .filter((item) => item.total < effectiveThreshold)
    .sort((a, b) => a.total - b.total);
}
