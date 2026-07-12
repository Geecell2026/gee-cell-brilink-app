import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatTanggalDaftar } from "../formatters";
import type { InsightContext, InsightResult, InsightSeverity } from "../types";

export const RULE_ID = "data-completeness";
export const RULE_VERSION = "1.0.0";

function tambahHari(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

// Kelengkapan dihitung per cabang, diklem ke [max(periodStart, tanggal laporan
// pertama cabang), min(periodEnd, besok)] - supaya hari sebelum cabang mulai
// beroperasi dan hari mendatang tidak ikut dihitung sebagai "belum input".
// Branch tanpa firstReportDate sama sekali (belum pernah lapor sekalipun)
// sengaja dilewati di sini - itu kasus berbeda dari "beberapa hari bolong",
// akan lebih jelas ditangani rule tersendiri kalau dibutuhkan nanti.
export function generateDataCompletenessInsights(context: InsightContext): InsightResult[] {
  const results: InsightResult[] = [];
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);
  const besok = tambahHari(
    new Date(Date.UTC(context.today.getUTCFullYear(), context.today.getUTCMonth(), context.today.getUTCDate())),
    1
  );

  for (const branch of context.branches) {
    if (!branch.firstReportDate) continue;

    const expectedStart = branch.firstReportDate > context.periodStart ? branch.firstReportDate : context.periodStart;
    const expectedEnd = context.periodEnd < besok ? context.periodEnd : besok;
    if (expectedStart >= expectedEnd) continue;

    const expectedDays = Math.round((expectedEnd.getTime() - expectedStart.getTime()) / 86400000);
    const reportedDates = new Set(
      branch.currentPoints
        .filter((p) => p.date.getTime() >= expectedStart.getTime() && p.date.getTime() < expectedEnd.getTime())
        .map((p) => p.date.toISOString().slice(0, 10))
    );
    const submittedDays = reportedDates.size;
    const missingDays = expectedDays - submittedDays;
    if (missingDays < INSIGHT_THRESHOLDS.minMissingDaysForInsight) continue;

    const completeness = expectedDays > 0 ? (submittedDays / expectedDays) * 100 : 0;

    const missingDates: Date[] = [];
    for (let d = expectedStart; d.getTime() < expectedEnd.getTime(); d = tambahHari(d, 1)) {
      if (!reportedDates.has(d.toISOString().slice(0, 10))) missingDates.push(d);
    }

    let severity: InsightSeverity;
    if (completeness < 50) severity = "critical";
    else if (completeness < 80) severity = "warning";
    else severity = "attention";

    const tanggalList = formatTanggalDaftar(missingDates, INSIGHT_THRESHOLDS.maxMissingDatesShown);

    results.push({
      id: `${RULE_ID}:${branch.branchId}:${periodStart}:${periodEnd}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "data_completeness",
      severity,
      priorityScore: computePriorityScore({ severity, occurrences: missingDays, sampleSize: expectedDays }),
      title: `Kelengkapan laporan ${branch.branchName} ${completeness < 50 ? "rendah" : "belum lengkap"}`,
      message: `Cabang ${branch.branchName} belum menginput ${missingDays} dari ${expectedDays} hari periode ${context.periodLabel} (${tanggalList}).`,
      action: "Lengkapi laporan tanggal yang masih kosong dan konfirmasi ke penanggung jawab cabang.",
      entityType: "branch",
      entityId: branch.branchId,
      entityName: branch.branchName,
      metricValue: missingDays,
      comparisonValue: expectedDays,
      periodStart,
      periodEnd,
      sourceModules: ["Data & Validasi", "Transaksi Harian"],
      href: "/analisis/data",
      generatedAt: context.generatedAt,
    });
  }

  return results;
}
