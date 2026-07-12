import { describe, expect, it } from "vitest";
import { generateCostRatioInsights } from "../rules/cost-ratio";
import { buatBranch, buatContext } from "./test-helpers";

describe("generateCostRatioInsights", () => {
  it("menghitung Cost Ratio dan selisihnya dalam POIN PERSENTASE, bukan persen relatif", () => {
    // current: 8jt/40jt = 20% (bukan 21,5/29,8 dari contoh spec, angka bulat biar mudah diverifikasi)
    // previous: 4jt/40jt = 10%
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPendapatan: 40_000_000,
          currentBiaya: 8_000_000,
          previousPendapatan: 40_000_000,
          previousBiaya: 4_000_000,
        }),
      ],
    });
    const hasil = generateCostRatioInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].metricValue).toBeCloseTo(20);
    expect(hasil[0].comparisonValue).toBeCloseTo(10);
    // selisih 10 poin persentase, bukan "naik 10%" atau "naik 100%"
    expect(hasil[0].message).toContain("poin persentase");
    expect(hasil[0].message).toContain("10.0");
  });

  it("pendapatan periode aktif nol -> suppress, tidak menghasilkan Infinity", () => {
    const context = buatContext({
      branches: [
        buatBranch({ branchId: "ekek", branchName: "Ekek", currentPendapatan: 0, currentBiaya: 500_000, previousPendapatan: 10_000_000, previousBiaya: 2_000_000 }),
      ],
    });
    const hasil = generateCostRatioInsights(context);
    expect(hasil).toEqual([]);
  });

  it("pendapatan periode pembanding nol -> suppress juga (bukan cuma periode aktif)", () => {
    const context = buatContext({
      branches: [
        buatBranch({ branchId: "ekek", branchName: "Ekek", currentPendapatan: 10_000_000, currentBiaya: 2_000_000, previousPendapatan: 0, previousBiaya: 0 }),
      ],
    });
    const hasil = generateCostRatioInsights(context);
    expect(hasil).toEqual([]);
  });

  it("perubahan kecil di bawah ambang dan Cost Ratio tidak tinggi -> tidak menghasilkan insight", () => {
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPendapatan: 40_000_000,
          currentBiaya: 8_000_000, // 20%
          previousPendapatan: 40_000_000,
          previousBiaya: 7_600_000, // 19% -> selisih cuma 1 poin, di bawah ambang 5
        }),
      ],
    });
    expect(generateCostRatioInsights(context)).toEqual([]);
  });

  it("menyebut cabang penyumbang kenaikan Cost Ratio terbesar saat ada beberapa cabang", () => {
    const context = buatContext({
      branches: [
        // Samsat: cost ratio naik drastis (biaya naik tajam) - besar & signifikan
        // cukup untuk mengangkat rata-rata Cost Ratio WILAYAH melewati ambang 5 poin.
        buatBranch({
          branchId: "samsat",
          branchName: "Samsat",
          currentPendapatan: 5_000_000,
          currentBiaya: 4_000_000, // 80%
          previousPendapatan: 6_000_000,
          previousBiaya: 1_200_000, // 20% -> naik 60 poin
        }),
        // Ekek: stabil (tidak berkontribusi ke perubahan)
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPendapatan: 40_000_000,
          currentBiaya: 6_000_000,
          previousPendapatan: 40_000_000,
          previousBiaya: 6_000_000,
        }),
      ],
    });
    const hasil = generateCostRatioInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].message).toContain("Samsat");
    expect(hasil[0].entityName).toBe("Samsat");
  });
});
