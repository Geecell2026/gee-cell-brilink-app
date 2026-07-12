import { describe, expect, it } from "vitest";
import { generateBranchTrendContributionInsights } from "../rules/branch-trend-contribution";
import { buatBranch, buatContext } from "./test-helpers";

describe("generateBranchTrendContributionInsights", () => {
  it("penurunan wilayah -> memilih cabang dengan delta NOMINAL absolut terbesar, bukan persentase terbesar", () => {
    const context = buatContext({
      branches: [
        // RCKH: turun Rp1.250.000 (delta nominal besar, basis besar -> persentase kecil)
        buatBranch({ branchId: "rckh", branchName: "RCKH", currentPendapatan: 8_750_000, previousPendapatan: 10_000_000 }),
        // Paseh: turun Rp50.000 tapi basisnya kecil sehingga persentasenya EKSTRIM (-50%)
        buatBranch({ branchId: "paseh", branchName: "Paseh", currentPendapatan: 50_000, previousPendapatan: 100_000 }),
      ],
    });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].entityName).toBe("RCKH");
    expect(hasil[0].message).toContain("RCKH");
    expect(hasil[0].message).toContain("Rp");
    expect(hasil[0].message).toContain("1.250.000");
  });

  it("kenaikan wilayah -> memilih cabang penyumbang kenaikan terbesar", () => {
    const context = buatContext({
      branches: [
        buatBranch({ branchId: "ekek", branchName: "Ekek", currentPendapatan: 12_000_000, previousPendapatan: 10_000_000 }),
        buatBranch({ branchId: "ab", branchName: "AB", currentPendapatan: 5_100_000, previousPendapatan: 5_000_000 }),
      ],
    });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].severity).toBe("positive");
    expect(hasil[0].entityName).toBe("Ekek");
  });

  it("previousTotal 0 (tidak ada baseline pembanding) -> suppress, tidak menghasilkan Infinity/NaN", () => {
    const context = buatContext({
      branches: [buatBranch({ branchId: "ab2", branchName: "AB 2", currentPendapatan: 1_000_000, previousPendapatan: 0 })],
    });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil).toEqual([]);
  });

  it("perubahan wilayah di bawah ambang minimum -> tidak menghasilkan insight (hindari noise)", () => {
    const context = buatContext({
      branches: [
        buatBranch({ branchId: "ekek", branchName: "Ekek", currentPendapatan: 10_100_000, previousPendapatan: 10_000_000 }),
      ],
    });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil).toEqual([]);
  });

  it("tidak pernah menghasilkan NaN/Infinity pada priorityScore atau metricValue", () => {
    const context = buatContext({
      branches: [
        buatBranch({ branchId: "rckh", branchName: "RCKH", currentPendapatan: 8_000_000, previousPendapatan: 10_000_000 }),
      ],
    });
    const hasil = generateBranchTrendContributionInsights(context);
    for (const h of hasil) {
      expect(Number.isFinite(h.priorityScore)).toBe(true);
      expect(Number.isFinite(h.metricValue ?? 0)).toBe(true);
    }
  });
});
