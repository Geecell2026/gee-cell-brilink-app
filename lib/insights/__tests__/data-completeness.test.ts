import { describe, expect, it } from "vitest";
import { generateDataCompletenessInsights } from "../rules/data-completeness";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

describe("generateDataCompletenessInsights", () => {
  it("hari MENDATANG (setelah hari ini) tidak ikut dihitung sebagai hari yang seharusnya dilaporkan", () => {
    // today = 5 Juli -> hari yang diharapkan cuma s.d. 5 Juli (5 hari: 1-5 Juli),
    // bukan sampai akhir periode (12 Juli) yang masih 7 hari lagi di masa depan.
    const points = buatPoints("Ekek", [
      { date: "2026-07-01", total: 10 },
      { date: "2026-07-03", total: 12 },
      { date: "2026-07-05", total: 9 },
    ]);
    const context = buatContext({
      today: new Date("2026-07-05T00:00:00Z"),
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
          currentPoints: points,
        }),
      ],
    });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].comparisonValue).toBe(5); // expectedDays = 1-5 Juli saja
    expect(hasil[0].metricValue).toBe(2); // missing: 2 & 4 Juli
  });

  it("hari SEBELUM cabang mulai beroperasi (firstReportDate) tidak ikut dihitung", () => {
    const points = buatPoints("AB2", [
      { date: "2026-07-08", total: 3 },
      { date: "2026-07-09", total: 2 },
      { date: "2026-07-10", total: 4 },
    ]);
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ab2",
          branchName: "AB 2",
          firstReportDate: new Date("2026-07-08T00:00:00Z"),
          currentPoints: points,
        }),
      ],
    });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].comparisonValue).toBe(5); // 8-12 Juli saja (bukan 1-12 Juli)
    expect(hasil[0].metricValue).toBe(2); // missing: 11 & 12 Juli
  });

  it("cabang yang belum pernah melapor sama sekali (firstReportDate null) dilewati, bukan dianggap 100% bolong", () => {
    const context = buatContext({
      branches: [buatBranch({ branchId: "ck", branchName: "CK", firstReportDate: null, currentPoints: [] })],
    });
    expect(generateDataCompletenessInsights(context)).toEqual([]);
  });

  it("kelengkapan < 50% -> severity critical", () => {
    const points = buatPoints("Samsat", [{ date: "2026-07-01", total: 5 }]);
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "samsat",
          branchName: "Samsat",
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
          currentPoints: points,
        }),
      ],
    });
    // expectedDays = 12 (1-12 Juli), submitted = 1 -> completeness ~8.3% -> critical
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].severity).toBe("critical");
  });

  it("jumlah hari bolong di bawah ambang minimum -> tidak menghasilkan insight (hindari noise satu hari lupa input)", () => {
    const points = buatPoints("Ekek", [
      { date: "2026-07-01", total: 10 },
      { date: "2026-07-02", total: 11 },
      { date: "2026-07-03", total: 12 },
      { date: "2026-07-04", total: 13 },
      { date: "2026-07-05", total: 14 },
    ]);
    // today dibuat sama dengan hari terakhir yang dilaporkan supaya expectedDays=5, missing=0
    const context = buatContext({
      today: new Date("2026-07-05T00:00:00Z"),
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
          currentPoints: points,
        }),
      ],
    });
    expect(generateDataCompletenessInsights(context)).toEqual([]);
  });
});
