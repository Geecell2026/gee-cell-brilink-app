import { describe, expect, it } from "vitest";
import { generateInsights } from "../engine";
import { buatBranch, buatContext } from "./test-helpers";
import { INSIGHT_THRESHOLDS } from "../thresholds";

// Bangun context dengan 6 cabang bolong laporan (memicu banyak insight
// data_completeness kalau tidak digabung/dibatasi) PLUS 1 Cost Ratio critical
// dan beberapa anomali - dipakai untuk menguji category budget Dashboard.
function contextCampuran() {
  const branches = ["AB", "AB 2", "CK", "Ekek", "Paramon", "Paseh"].map((name, i) =>
    buatBranch({
      branchId: `b${i}`,
      branchName: name,
      firstReportDate: new Date("2026-06-01T00:00:00Z"),
      currentPoints: [],
      // Cost Ratio critical: biaya jauh lebih besar dari pendapatan, hanya di cabang pertama supaya ringkas.
      currentPendapatan: i === 0 ? 10_000_000 : 0,
      currentBiaya: i === 0 ? 9_000_000 : 0,
      previousPendapatan: i === 0 ? 10_000_000 : 0,
      previousBiaya: i === 0 ? 1_000_000 : 0,
    })
  );
  return buatContext({ branches });
}

describe("category budget (Dashboard)", () => {
  it("6 insight kelengkapan tidak memenuhi seluruh 7 slot Dashboard - kategori lain tetap kebagian tempat", () => {
    const context = contextCampuran();
    const hasil = generateInsights(context, { maxResults: INSIGHT_THRESHOLDS.maxDashboardInsights });
    const completenessCount = hasil.filter((h) => h.category === "data_completeness").length;
    expect(completenessCount).toBeLessThanOrEqual(INSIGHT_THRESHOLDS.dashboardCategoryBudget.data_completeness);
  });

  it("Cost Ratio critical tetap muncul walau banyak insight kelengkapan bersaing", () => {
    const context = contextCampuran();
    const hasil = generateInsights(context, { maxResults: INSIGHT_THRESHOLDS.maxDashboardInsights });
    expect(hasil.some((h) => h.category === "cost_ratio")).toBe(true);
  });

  it("maksimal per kategori diterapkan sesuai konfigurasi", () => {
    const context = contextCampuran();
    const hasil = generateInsights(context, { maxResults: INSIGHT_THRESHOLDS.maxDashboardInsights });
    const perKategori = new Map<string, number>();
    for (const h of hasil) perKategori.set(h.category, (perKategori.get(h.category) ?? 0) + 1);
    for (const [kategori, jumlah] of perKategori) {
      const budget =
        (INSIGHT_THRESHOLDS.dashboardCategoryBudget as Record<string, number>)[kategori] ??
        INSIGHT_THRESHOLDS.defaultCategoryBudget;
      expect(jumlah).toBeLessThanOrEqual(budget);
    }
  });

  it("total Dashboard tidak pernah melebihi maxDashboardInsights (7)", () => {
    const context = contextCampuran();
    const hasil = generateInsights(context, { maxResults: INSIGHT_THRESHOLDS.maxDashboardInsights });
    expect(hasil.length).toBeLessThanOrEqual(INSIGHT_THRESHOLDS.maxDashboardInsights);
  });

  it("Ringkasan Owner (tanpa maxResults) TIDAK dibatasi category budget - dapat semua insight", () => {
    const context = contextCampuran();
    const dashboard = generateInsights(context, { maxResults: INSIGHT_THRESHOLDS.maxDashboardInsights });
    const owner = generateInsights(context);
    expect(owner.length).toBeGreaterThanOrEqual(dashboard.length);
  });
});
