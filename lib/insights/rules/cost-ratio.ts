import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatPersen, formatPoinPersentase, formatRupiah } from "../formatters";
import type { InsightContext, InsightResult, InsightSeverity } from "../types";

export const RULE_ID = "cost-ratio";
export const RULE_VERSION = "1.0.0";

// Cost Ratio = Total Biaya / Total Pendapatan x 100% - BEDA dari Margin
// Operasional ((Pendapatan-Biaya)/Pendapatan x 100%), rule ini fokus ke Cost
// Ratio saja sesuai permintaan. Total Biaya/Pendapatan dipakai dari
// hitungPendapatanBiayaLaba yang sama dengan Dashboard (sumber Transaksi
// Harian saja) - TIDAK menggabungkan ExpenseEntry/modul Biaya, supaya tidak
// mengubah definisi Total Biaya existing secara diam-diam.
export function generateCostRatioInsights(context: InsightContext): InsightResult[] {
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);

  const currentPendapatan = context.branches.reduce((s, b) => s + b.currentPendapatan, 0);
  const currentBiaya = context.branches.reduce((s, b) => s + b.currentBiaya, 0);
  const previousPendapatan = context.branches.reduce((s, b) => s + b.previousPendapatan, 0);
  const previousBiaya = context.branches.reduce((s, b) => s + b.previousBiaya, 0);

  // Pendapatan nol (periode aktif atau pembanding) -> Cost Ratio tidak
  // bermakna/bisa Infinity - suppress, jangan dipaksa dihitung.
  if (currentPendapatan <= 0 || previousPendapatan <= 0) return [];

  const costRatio = (currentBiaya / currentPendapatan) * 100;
  const prevCostRatio = (previousBiaya / previousPendapatan) * 100;
  const deltaPoin = costRatio - prevCostRatio;

  const perubahanSignifikan = Math.abs(deltaPoin) >= INSIGHT_THRESHOLDS.costRatioChangePoints;
  const costRatioTinggi = costRatio >= INSIGHT_THRESHOLDS.highCostRatio;
  if (!perubahanSignifikan && !costRatioTinggi) return [];

  const branchRatios = context.branches
    .filter((b) => b.currentPendapatan > 0 && b.previousPendapatan > 0)
    .map((b) => {
      const current = (b.currentBiaya / b.currentPendapatan) * 100;
      const previous = (b.previousBiaya / b.previousPendapatan) * 100;
      return {
        branch: b,
        deltaPoin: current - previous,
        biayaDelta: b.currentBiaya - b.previousBiaya,
        pendapatanDelta: b.currentPendapatan - b.previousPendapatan,
      };
    });
  const topContributor =
    branchRatios.length > 0 ? [...branchRatios].sort((a, b) => b.deltaPoin - a.deltaPoin)[0] : null;

  let severity: InsightSeverity;
  if (costRatio >= 40 || deltaPoin >= 10) severity = "critical";
  else if (costRatioTinggi || deltaPoin >= INSIGHT_THRESHOLDS.costRatioChangePoints) severity = "warning";
  else severity = "attention";

  const arah = deltaPoin >= 0 ? "naik" : "turun";
  let message = `Rasio biaya terhadap pendapatan Wilayah Ekek ${arah} dari ${formatPersen(prevCostRatio)} menjadi ${formatPersen(costRatio)}, ${formatPoinPersentase(deltaPoin)} dibanding ${context.comparisonLabel}.`;

  if (topContributor && topContributor.deltaPoin > 0.5) {
    message += ` Kenaikan Cost Ratio terbesar terjadi di Cabang ${topContributor.branch.branchName} karena biaya ${topContributor.biayaDelta >= 0 ? "naik" : "turun"} ${formatRupiah(Math.abs(topContributor.biayaDelta))} sementara pendapatan ${topContributor.pendapatanDelta >= 0 ? "naik" : "turun"} ${formatRupiah(Math.abs(topContributor.pendapatanDelta))}.`;
  }

  return [
    {
      id: `${RULE_ID}:region:${periodStart}:${periodEnd}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "cost_ratio",
      severity,
      priorityScore: computePriorityScore({ severity, absoluteRupiahImpact: currentBiaya - previousBiaya }),
      title: `Cost Ratio ${arah} ${formatPoinPersentase(Math.abs(deltaPoin))}`,
      message,
      action: "Tinjau komponen biaya terbesar dan bandingkan dengan pendapatan cabang.",
      entityType: topContributor ? "branch" : "region",
      entityId: topContributor?.branch.branchId,
      entityName: topContributor?.branch.branchName ?? "Wilayah Ekek",
      metricValue: costRatio,
      comparisonValue: prevCostRatio,
      periodStart,
      periodEnd,
      sourceModules: ["Transaksi Harian", "Biaya"],
      href: "/biaya",
      generatedAt: context.generatedAt,
    },
  ];
}
