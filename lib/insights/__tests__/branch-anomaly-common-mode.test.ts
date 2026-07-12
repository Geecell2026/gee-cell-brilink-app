import { describe, expect, it } from "vitest";
import { generateBranchAnomalyInsights } from "../rules/branch-anomaly";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

// 4 hari datar (10) lalu lonjakan di hari ke-4 (25, +150% vs hari sebelumnya) -
// cukup untuk memicu "Kenaikan Drastis" pada deteksiAnomali tanpa bergantung
// pada z-score (jumlah data cuma 4 titik).
function cabangLonjakan(branchId: string, branchName: string, tanggalLonjakan: string) {
  const semuaTanggal = ["2026-07-01", "2026-07-02", "2026-07-03", tanggalLonjakan];
  const points = buatPoints(
    branchName,
    semuaTanggal.map((d, i) => ({ date: d, total: i === 3 ? 25 : 10 }))
  );
  return buatBranch({ branchId, branchName, currentPoints: points });
}

function cabangDatar(branchId: string, branchName: string) {
  const points = buatPoints(branchName, [
    { date: "2026-07-01", total: 10 },
    { date: "2026-07-02", total: 10 },
    { date: "2026-07-03", total: 10 },
    { date: "2026-07-04", total: 11 },
  ]);
  return buatBranch({ branchId, branchName, currentPoints: points });
}

describe("generateBranchAnomalyInsights - common-mode", () => {
  it("7 dari 10 cabang lonjakan pada tanggal berdekatan -> digabung jadi SATU insight wilayah, bukan 7 insight individual", () => {
    const context = buatContext({
      branches: [
        cabangLonjakan("b1", "Ekek", "2026-07-04"),
        cabangLonjakan("b2", "AB", "2026-07-04"),
        cabangLonjakan("b3", "AB 2", "2026-07-05"),
        cabangLonjakan("b4", "CK", "2026-07-05"),
        cabangLonjakan("b5", "Paramon", "2026-07-04"),
        cabangLonjakan("b6", "Paseh", "2026-07-04"),
        cabangLonjakan("b7", "RCKH", "2026-07-05"),
        cabangDatar("b8", "Samsat"),
        cabangDatar("b9", "SJ"),
        cabangDatar("b10", "Permata Biru"),
      ],
    });
    const hasil = generateBranchAnomalyInsights(context);
    const commonMode = hasil.filter((h) => h.id.includes("common-mode-naik"));
    expect(commonMode).toHaveLength(1);
    expect(commonMode[0].message).toContain("7 dari 10 cabang");
    expect(commonMode[0].message).toContain("kemungkinan");
    expect(commonMode[0].groupMembers).toHaveLength(7);

    // Ketujuh cabang yang terserap common-mode TIDAK boleh masing-masing masih
    // punya insight lonjakan individual sendiri (itu tujuan penggabungannya).
    const individualLonjakan = hasil.filter(
      (h) => h.title.includes("mencatat lonjakan") && !h.id.includes("common-mode")
    );
    expect(individualLonjakan).toHaveLength(0);
  });

  it("hanya 1 cabang lonjakan (di bawah ambang 50%) -> tetap insight individual, bukan common-mode", () => {
    const context = buatContext({
      branches: [
        cabangLonjakan("b1", "Ekek", "2026-07-04"),
        cabangDatar("b2", "AB"),
        cabangDatar("b3", "CK"),
      ],
    });
    const hasil = generateBranchAnomalyInsights(context);
    expect(hasil.some((h) => h.id.includes("common-mode"))).toBe(false);
    expect(hasil.some((h) => h.title.includes("Ekek") && h.title.includes("lonjakan"))).toBe(true);
  });

  it("cabang yang jauh lebih ekstrem dari rata-rata kelompok TETAP dapat insight individual di luar common-mode", () => {
    // 7 cabang lonjakan wajar (25), 1 di antaranya (Ekek) lonjakan JAUH lebih ekstrem (200).
    const branchesNormal = ["b2", "b3", "b4", "b5", "b6", "b7"].map((id, i) =>
      cabangLonjakan(id, `Cabang${i}`, "2026-07-04")
    );
    const ekstrem = buatBranch({
      branchId: "b1",
      branchName: "Ekek",
      currentPoints: buatPoints("Ekek", [
        { date: "2026-07-01", total: 10 },
        { date: "2026-07-02", total: 10 },
        { date: "2026-07-03", total: 10 },
        { date: "2026-07-04", total: 200 },
      ]),
    });
    const context = buatContext({
      branches: [ekstrem, ...branchesNormal, cabangDatar("b8", "Samsat"), cabangDatar("b9", "SJ"), cabangDatar("b10", "Permata Biru")],
    });
    const hasil = generateBranchAnomalyInsights(context);
    const commonMode = hasil.filter((h) => h.id.includes("common-mode-naik"));
    expect(commonMode).toHaveLength(1);
    // Ekek tetap punya insight individual karena magnitude-nya jauh di atas rata-rata kelompok.
    const ekekIndividual = hasil.find((h) => h.entityName === "Ekek" && !h.id.includes("common-mode"));
    expect(ekekIndividual).toBeDefined();
  });

  it("penyebab ditulis sebagai kemungkinan (bukan fakta pasti)", () => {
    const context = buatContext({
      branches: [
        cabangLonjakan("b1", "Ekek", "2026-07-04"),
        cabangLonjakan("b2", "AB", "2026-07-04"),
        cabangLonjakan("b3", "CK", "2026-07-05"),
        cabangDatar("b4", "Paramon"),
      ],
    });
    const hasil = generateBranchAnomalyInsights(context);
    const commonMode = hasil.find((h) => h.id.includes("common-mode-naik"));
    expect(commonMode).toBeDefined();
    expect(commonMode!.message).toMatch(/kemungkinan/i);
    expect(commonMode!.message).not.toMatch(/dipastikan|pasti disebabkan/i);
  });

  it("aman untuk data kosong / tidak ada anomali sama sekali", () => {
    const context = buatContext({ branches: [cabangDatar("b1", "Ekek"), cabangDatar("b2", "AB")] });
    expect(() => generateBranchAnomalyInsights(context)).not.toThrow();
    const hasil = generateBranchAnomalyInsights(context);
    expect(hasil.some((h) => h.id.includes("common-mode"))).toBe(false);
  });
});
