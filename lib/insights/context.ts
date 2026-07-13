import { db } from "@/lib/db";
import {
  fetchTransaksiPeriode,
  hitungPendapatanBiayaLaba,
  resolveComparablePeriod,
} from "@/lib/calculations/dashboard";
import { perkayaDailyPoints } from "@/lib/analytics/aggregation";
import type { RawTx } from "@/lib/analytics/aggregation";
import { isBranchOperationalOnDate, isBranchConfigIncomplete } from "@/lib/calculations/operational-period";
import type { PeriodeMode } from "@/types/dashboard";
import type { InsightContext, BranchInsightData } from "./types";
import { formatTanggalSingkat } from "./formatters";

// Membangun seluruh data yang dibutuhkan rule insight dalam BATCH query (bukan
// N+1 per cabang): 2 query transaksi (periode aktif + pembanding, semua cabang
// sekaligus lewat fetchTransaksiPeriode(undefined, ...)) + 1 aggregate MIN(date)
// per cabang untuk tanggal laporan pertama. Cabang wilayah lain tidak mungkin
// ikut terbaca karena database Ekek secara struktural cuma berisi cabang Ekek
// sendiri (bukan multi-tenant satu database).
//
// Query branch TIDAK difilter isActive:true (beda dari sebelumnya) - status
// terkini bukan penentu histori operasional (section 3.B spec periode
// operasional). Cabang yang saat ini Nonaktif tetap harus muncul di sini supaya
// rule masih bisa mengevaluasi periode SEBELUM tanggal tutupnya. Rule yang
// butuh "cabang operasional pada periode ini" memfilter sendiri lewat
// isBranchOperationalDuringRange (lib/calculations/operational-period.ts).
export async function buildInsightContext(params: {
  startDate: Date;
  endDate: Date;
  comparisonMode: PeriodeMode;
}): Promise<InsightContext> {
  const { startDate, endDate, comparisonMode } = params;
  const { prevStart, prevEnd, pembandingLabel } = resolveComparablePeriod(startDate, endDate, comparisonMode);

  const [branches, currentTx, prevTx, firstDates] = await Promise.all([
    db.branch.findMany({ orderBy: { name: "asc" } }),
    fetchTransaksiPeriode(undefined, startDate, endDate),
    fetchTransaksiPeriode(undefined, prevStart, prevEnd),
    db.dailyTransaction.groupBy({ by: ["branchId"], _min: { date: true } }),
  ]);

  const firstDateMap = new Map(firstDates.map((f) => [f.branchId, f._min.date]));

  const branchesData: BranchInsightData[] = branches.map((branch) => {
    const curr = currentTx.filter((tx) => tx.branchId === branch.id);
    const prev = prevTx.filter((tx) => tx.branchId === branch.id);
    const firstReportDate = firstDateMap.get(branch.id) ?? null;

    // Total aktual (currentPendapatan/currentBiaya) SENGAJA tidak diklem ke
    // periode operasional - ini "Total aktual wilayah" (section 10.A), data
    // asli yang benar-benar terjadi apa adanya.
    const { pendapatan: currentPendapatan, biaya: currentBiaya } = hitungPendapatanBiayaLaba(curr);
    const { pendapatan: previousPendapatan, biaya: previousBiaya } = hitungPendapatanBiayaLaba(prev);

    const rawTx: RawTx[] = curr.map((tx) => ({
      date: tx.date,
      branchName: branch.name,
      totalTransaksi: tx.tellerBreakdown.reduce(
        (sum, t) => sum + Number(t.tf) + Number(t.eWallet) + Number(t.itTt),
        0
      ),
    }));
    // currentPoints DIKLEM ke periode operasional (fallback ke firstReportDate
    // kalau tanggalMulaiOperasi belum diisi) - Kelengkapan Data & Deteksi
    // Anomali mengonsumsi currentPoints ini apa adanya, tidak perlu cek ulang.
    const currentPoints = perkayaDailyPoints(rawTx)
      .filter((p) => isBranchOperationalOnDate(branch, p.date, firstReportDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      branchId: branch.id,
      branchName: branch.name,
      isActive: branch.isActive,
      tanggalMulaiOperasi: branch.tanggalMulaiOperasi,
      tanggalTutupOperasi: branch.tanggalTutupOperasi,
      isConfigIncomplete: isBranchConfigIncomplete(branch),
      firstReportDate,
      currentPoints,
      currentPendapatan,
      currentBiaya,
      previousPendapatan,
      previousBiaya,
    };
  });

  const periodEndInclusive = new Date(endDate.getTime() - 86400000);

  return {
    branches: branchesData,
    periodStart: startDate,
    periodEnd: endDate,
    previousPeriodStart: prevStart,
    previousPeriodEnd: prevEnd,
    periodLabel: `${formatTanggalSingkat(startDate)} - ${formatTanggalSingkat(periodEndInclusive)}`,
    comparisonLabel: pembandingLabel,
    today: new Date(),
    generatedAt: new Date().toISOString(),
  };
}
