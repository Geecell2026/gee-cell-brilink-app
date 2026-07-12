import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatPersen, formatRupiah } from "../formatters";
import type { InsightContext, InsightResult } from "../types";

export const RULE_ID = "branch-trend-contribution";
export const RULE_VERSION = "1.0.0";

function severityUntukPenurunan(persenAbs: number): InsightResult["severity"] {
  if (persenAbs >= 15) return "critical";
  if (persenAbs >= 8) return "warning";
  return "attention";
}

// Cabang penyumbang perubahan wilayah dipilih berdasarkan DELTA NOMINAL absolut
// terbesar (bukan persentase) - sengaja, supaya cabang basis kecil dengan
// persentase ekstrem tidak salah diprioritaskan di atas cabang basis besar
// dengan pergerakan nominal jauh lebih signifikan.
export function generateBranchTrendContributionInsights(context: InsightContext): InsightResult[] {
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);

  const currentTotal = context.branches.reduce((s, b) => s + b.currentPendapatan, 0);
  const previousTotal = context.branches.reduce((s, b) => s + b.previousPendapatan, 0);

  // Tanpa baseline pembanding yang valid, persentase perubahan tidak bermakna -
  // suppress daripada menampilkan "turun 100%" yang menyesatkan.
  if (previousTotal <= 0) return [];

  const regionDelta = currentTotal - previousTotal;
  const regionPersen = (regionDelta / previousTotal) * 100;
  if (Math.abs(regionPersen) < INSIGHT_THRESHOLDS.minRegionChangePercentForTrendInsight) return [];

  const deltas = context.branches
    .map((b) => ({ branch: b, delta: b.currentPendapatan - b.previousPendapatan }))
    .filter((d) => d.delta !== 0);
  if (deltas.length === 0) return [];

  if (regionDelta < 0) {
    const negatives = deltas.filter((d) => d.delta < 0);
    if (negatives.length === 0) return [];
    const sumAbsNegatif = negatives.reduce((s, d) => s + Math.abs(d.delta), 0);
    const top = [...negatives].sort((a, b) => a.delta - b.delta)[0];
    const kontribusiPersen = sumAbsNegatif > 0 ? (Math.abs(top.delta) / sumAbsNegatif) * 100 : 0;
    const severity = severityUntukPenurunan(Math.abs(regionPersen));

    return [
      {
        id: `${RULE_ID}:region:${periodStart}:${periodEnd}`,
        ruleId: RULE_ID,
        ruleVersion: RULE_VERSION,
        category: "branch_performance",
        severity,
        priorityScore: computePriorityScore({ severity, absoluteRupiahImpact: regionDelta }),
        title: `Pendapatan Wilayah Ekek turun ${formatPersen(Math.abs(regionPersen))}`,
        message: `Pendapatan Wilayah Ekek turun ${formatPersen(Math.abs(regionPersen))} dibanding ${context.comparisonLabel}. Penurunan terbesar berasal dari Cabang ${top.branch.branchName}, turun ${formatRupiah(Math.abs(top.delta))} atau menyumbang ${formatPersen(kontribusiPersen)} dari total penurunan wilayah.`,
        action: "Prioritaskan evaluasi transaksi dan pendapatan Cabang " + top.branch.branchName + ".",
        entityType: "branch",
        entityId: top.branch.branchId,
        entityName: top.branch.branchName,
        metricValue: regionDelta,
        comparisonValue: previousTotal,
        periodStart,
        periodEnd,
        sourceModules: ["Transaksi Harian", "Mingguan & Bulanan"],
        href: "/analisis/mingguan-bulanan",
        generatedAt: context.generatedAt,
      },
    ];
  }

  const positives = deltas.filter((d) => d.delta > 0);
  if (positives.length === 0) return [];
  const top = [...positives].sort((a, b) => b.delta - a.delta)[0];

  return [
    {
      id: `${RULE_ID}:region:${periodStart}:${periodEnd}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "branch_performance",
      severity: "positive",
      priorityScore: computePriorityScore({ severity: "positive", absoluteRupiahImpact: regionDelta }),
      title: `Pendapatan Wilayah Ekek tumbuh ${formatPersen(regionPersen)}`,
      message: `Pertumbuhan pendapatan Wilayah Ekek terutama didorong Cabang ${top.branch.branchName}, naik ${formatRupiah(top.delta)} dibanding ${context.comparisonLabel}.`,
      action: "Tinjau strategi Cabang " + top.branch.branchName + " untuk direplikasi ke cabang lain.",
      entityType: "branch",
      entityId: top.branch.branchId,
      entityName: top.branch.branchName,
      metricValue: regionDelta,
      comparisonValue: previousTotal,
      periodStart,
      periodEnd,
      sourceModules: ["Transaksi Harian", "Mingguan & Bulanan"],
      href: "/analisis/mingguan-bulanan",
      generatedAt: context.generatedAt,
    },
  ];
}
