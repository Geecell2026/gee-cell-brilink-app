import { describe, expect, it } from "vitest";
import { generateDataCompletenessInsights } from "../rules/data-completeness";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

// Semua branch di sini dianggap mulai beroperasi sebelum periode aktif, dan
// tidak melapor sama sekali pada periode aktif (kecuali disebutkan lain) -
// expectedDays = 12 (1-12 Juli, today=12 Juli default context).
function cabangBolong(branchId: string, branchName: string, jumlahHariTerlapor: number) {
  const points = buatPoints(
    branchName,
    Array.from({ length: jumlahHariTerlapor }, (_, i) => ({ date: `2026-07-0${i + 1}`, total: 10 }))
  );
  return buatBranch({ branchId, branchName, firstReportDate: new Date("2026-06-01T00:00:00Z"), currentPoints: points });
}

describe("generateDataCompletenessInsights - grouping", () => {
  it("6 cabang sama-sama bolong -> digabung jadi SATU insight regional, bukan 6 insight terpisah", () => {
    const context = buatContext({
      branches: [
        cabangBolong("ab", "AB", 0),
        cabangBolong("ab2", "AB 2", 0),
        cabangBolong("ck", "CK", 0),
        cabangBolong("ekek", "Ekek", 0),
        cabangBolong("paramon", "Paramon", 0),
        cabangBolong("paseh", "Paseh", 0),
      ],
    });
    const hasil = generateDataCompletenessInsights(context);
    const grouped = hasil.filter((h) => h.id.includes(":region-group:"));
    expect(grouped).toHaveLength(1);
    expect(grouped[0].message).toContain("6 dari");
    expect(grouped[0].groupMembers).toHaveLength(6);
    // Tidak ada insight individual terpisah untuk masing-masing (semua sama parahnya, bukan outlier)
    const individual = hasil.filter((h) => !h.id.includes(":region-group:"));
    expect(individual).toHaveLength(0);
  });

  it("hanya 1 cabang bolong -> tetap insight individual (belum layak digabung)", () => {
    const context = buatContext({ branches: [cabangBolong("ekek", "Ekek", 0)] });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].id).not.toContain("region-group");
    expect(hasil[0].entityName).toBe("Ekek");
  });

  it("1 cabang jauh lebih kritis dari kelompok -> tetap dapat insight individual TAMBAHAN di luar grouped", () => {
    const context = buatContext({
      branches: [
        // 2 cabang cukup bolong (completeness ~50%) - jadi kandidat grup
        cabangBolong("ab", "AB", 6),
        cabangBolong("ck", "CK", 6),
        // Ekek jauh lebih parah (0% completeness) - outlier
        cabangBolong("ekek", "Ekek", 0),
      ],
    });
    const hasil = generateDataCompletenessInsights(context);
    const grouped = hasil.filter((h) => h.id.includes("region-group"));
    const individual = hasil.filter((h) => !h.id.includes("region-group"));
    expect(grouped).toHaveLength(1);
    expect(individual.some((h) => h.entityName === "Ekek")).toBe(true);
  });

  it("grouped insight TIDAK diduplikasi oleh insight anggota individual untuk cabang yang sama tingkat parahnya", () => {
    const context = buatContext({ branches: [cabangBolong("ab", "AB", 0), cabangBolong("ck", "CK", 0)] });
    const hasil = generateDataCompletenessInsights(context);
    const abIndividual = hasil.filter((h) => h.entityName === "AB" && !h.id.includes("region-group"));
    expect(abIndividual).toHaveLength(0);
  });

  it("stable id grouped insight konsisten antar-render (bukan acak, urutan branchId stabil)", () => {
    const context = buatContext({ branches: [cabangBolong("ck", "CK", 0), cabangBolong("ab", "AB", 0)] });
    const a = generateDataCompletenessInsights(context);
    const b = generateDataCompletenessInsights(context);
    expect(a.map((h) => h.id)).toEqual(b.map((h) => h.id));
  });

  it("tidak pernah menghasilkan grouped insight untuk 1 entitas, dan aman untuk data kosong", () => {
    expect(generateDataCompletenessInsights(buatContext({ branches: [] }))).toEqual([]);
  });
});
