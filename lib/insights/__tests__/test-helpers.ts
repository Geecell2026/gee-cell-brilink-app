import { perkayaDailyPoints } from "@/lib/analytics/aggregation";
import type { BranchInsightData, InsightContext } from "../types";

export function buatPoints(branchName: string, entries: { date: string; total: number }[]) {
  return perkayaDailyPoints(
    entries.map((e) => ({ date: new Date(`${e.date}T00:00:00Z`), branchName, totalTransaksi: e.total }))
  ).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buatBranch(
  overrides: Partial<BranchInsightData> & { branchId: string; branchName: string }
): BranchInsightData {
  return {
    isActive: true,
    firstReportDate: null,
    currentPoints: [],
    currentPendapatan: 0,
    currentBiaya: 0,
    previousPendapatan: 0,
    previousBiaya: 0,
    ...overrides,
  };
}

export function buatContext(overrides: Partial<InsightContext> & { branches: BranchInsightData[] }): InsightContext {
  return {
    periodStart: new Date("2026-07-01T00:00:00Z"),
    periodEnd: new Date("2026-07-13T00:00:00Z"),
    previousPeriodStart: new Date("2026-06-01T00:00:00Z"),
    previousPeriodEnd: new Date("2026-06-13T00:00:00Z"),
    periodLabel: "1 Jul - 12 Jul 2026",
    comparisonLabel: "1 Jun - 12 Jun 2026",
    today: new Date("2026-07-12T00:00:00Z"),
    generatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}
