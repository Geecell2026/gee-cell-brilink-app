import { deteksiAnomali } from "@/lib/analytics/anomaly";
import { rataRata } from "@/lib/analytics/statistics";
import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatTanggalDaftar } from "../formatters";
import type { InsightContext, InsightResult } from "../types";

export const RULE_ID = "branch-anomaly";
export const RULE_VERSION = "1.0.0";

// Sengaja TIDAK membuat rumus anomali sendiri - deteksiAnomali (dipakai juga di
// halaman Analisis Harian) sudah menghitung ini dengan benar (z-score >2SD +
// perubahan harian drastis). currentPoints di sini HANYA berisi hari yang
// SUDAH ada baris DailyTransaction (laporan belum masuk = beda rule, lihat
// data-completeness.ts) - jadi "0 transaksi" di sini selalu berarti hari itu
// benar-benar dilaporkan dengan nilai 0, bukan laporan yang hilang.
export function generateBranchAnomalyInsights(context: InsightContext): InsightResult[] {
  const results: InsightResult[] = [];
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);

  for (const branch of context.branches) {
    if (branch.currentPoints.length === 0) continue;

    const zeroDays = branch.currentPoints.filter((p) => p.totalTransaksi === 0);
    const nonZeroAvg = rataRata(branch.currentPoints.filter((p) => p.totalTransaksi > 0).map((p) => p.totalTransaksi));

    if (zeroDays.length > 0) {
      let severity: InsightResult["severity"] | null = null;
      if (zeroDays.length >= INSIGHT_THRESHOLDS.repeatedZeroTransactionDaysCritical) severity = "critical";
      else if (zeroDays.length >= INSIGHT_THRESHOLDS.repeatedZeroTransactionDaysWarning) severity = "warning";
      else if (zeroDays.length === 1 && nonZeroAvg > 3) severity = "attention";

      if (severity) {
        const tanggalList = formatTanggalDaftar(
          zeroDays.map((p) => p.date),
          INSIGHT_THRESHOLDS.maxMissingDatesShown
        );
        results.push({
          id: `${RULE_ID}:${branch.branchId}:${periodStart}:${periodEnd}:zero`,
          ruleId: RULE_ID,
          ruleVersion: RULE_VERSION,
          category: "anomaly",
          severity,
          priorityScore: computePriorityScore({
            severity,
            occurrences: zeroDays.length,
            sampleSize: branch.currentPoints.length,
          }),
          title: `Cabang ${branch.branchName} tercatat 0 transaksi berulang`,
          message: `Cabang ${branch.branchName} tercatat 0 transaksi pada ${zeroDays.length} dari ${branch.currentPoints.length} hari laporan pada periode ${context.periodLabel} (${tanggalList}).`,
          action: "Periksa laporan tanggal terkait dan konfirmasi kepada penanggung jawab cabang.",
          entityType: "branch",
          entityId: branch.branchId,
          entityName: branch.branchName,
          metricValue: zeroDays.length,
          comparisonValue: branch.currentPoints.length,
          periodStart,
          periodEnd,
          sourceModules: ["Transaksi Harian", "Deteksi Anomali"],
          href: "/analisis/harian",
          generatedAt: context.generatedAt,
        });
      }
    }

    // Anomali statistik lain (lonjakan/penurunan drastis) - hanya kejadian
    // PALING BARU per cabang supaya tidak membanjiri feed.
    const anomaliLain = deteksiAnomali(branch.currentPoints).filter((a) => a.totalTransaksi !== 0);
    if (anomaliLain.length > 0) {
      const terbaru = [...anomaliLain].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      const turun = terbaru.jenis.startsWith("Sangat Rendah") || terbaru.jenis.startsWith("Penurunan");
      const severity: InsightResult["severity"] = turun ? "warning" : "positive";
      const tanggal = terbaru.date.toISOString().slice(0, 10);

      results.push({
        id: `${RULE_ID}:${branch.branchId}:${periodStart}:${periodEnd}:${tanggal}`,
        ruleId: RULE_ID,
        ruleVersion: RULE_VERSION,
        category: "anomaly",
        severity,
        priorityScore: computePriorityScore({ severity, sampleSize: branch.currentPoints.length }),
        title: turun
          ? `Cabang ${branch.branchName} mengalami penurunan transaksi tidak biasa`
          : `Cabang ${branch.branchName} mencatat lonjakan transaksi`,
        message: `Cabang ${branch.branchName} tercatat ${terbaru.totalTransaksi} transaksi pada ${terbaru.date.toLocaleDateString("id-ID", { timeZone: "UTC" })} (${terbaru.jenis}). Kemungkinan penyebab: ${terbaru.kemungkinanPenyebab.join(", ")}.`,
        action: turun
          ? "Periksa laporan harian dan konfirmasi kondisi operasional cabang."
          : "Tinjau penyebab lonjakan untuk direplikasi di cabang lain.",
        entityType: "branch",
        entityId: branch.branchId,
        entityName: branch.branchName,
        metricValue: terbaru.totalTransaksi,
        comparisonValue: null,
        periodStart,
        periodEnd,
        sourceModules: ["Transaksi Harian", "Deteksi Anomali"],
        href: "/analisis/harian",
        generatedAt: context.generatedAt,
      });
    }
  }

  return results;
}
