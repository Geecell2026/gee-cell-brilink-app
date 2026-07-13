import { describe, expect, it } from "vitest";
import { generateDataCompletenessInsights } from "../rules/data-completeness";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// Konteks default helper: periodStart=1 Jul, periodEnd=13 Jul (eksklusif),
// today=12 Jul 2026 -> besok=13 Jul, jadi batas atas efektif = 13 Jul.
function hariBerturut(mulai: string, jumlah: number, total = 10) {
  const entries: { date: string; total: number }[] = [];
  const base = d(mulai);
  for (let i = 0; i < jumlah; i++) {
    entries.push({ date: new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10), total });
  }
  return entries;
}

describe("Kelengkapan Data - matriks B (periode operasional)", () => {
  it("1&7. cabang baru: hari sebelum tanggalMulaiOperasi tidak dihitung missing", () => {
    const branch = buatBranch({
      branchId: "b1",
      branchName: "Paseh",
      tanggalMulaiOperasi: d("2026-07-08"),
      firstReportDate: null,
      currentPoints: [], // belum pernah lapor sejak mulai
    });
    const context = buatContext({ branches: [branch] });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(1);
    // expectedDays = 8-13 Jul (eksklusif) = 5 hari, BUKAN 1-13 Jul = 12 hari.
    expect(hasil[0].comparisonValue).toBe(5);
    expect(hasil[0].metricValue).toBe(5);
  });

  it("2&8. cabang tutup: hari setelah tanggalTutupOperasi tidak dihitung missing", () => {
    const branch = buatBranch({
      branchId: "b2",
      branchName: "AB 2",
      tanggalMulaiOperasi: d("2026-01-01"),
      tanggalTutupOperasi: d("2026-07-05"),
      firstReportDate: d("2026-01-01"),
      currentPoints: buatPoints("AB 2", hariBerturut("2026-07-01", 5)), // lengkap 1-5 Jul, cabang tutup setelah itu
    });
    const context = buatContext({ branches: [branch] });
    const hasil = generateDataCompletenessInsights(context);
    // Tanpa klem operasional, 6-12 Jul (7 hari) akan dianggap missing. Dengan
    // klem ke tanggalTutupOperasi, expectedDays=5=submittedDays -> tidak ada insight.
    expect(hasil.length).toBe(0);
  });

  it("3. record 0/0 dalam periode aktif tetap dihitung submitted (bukan missing)", () => {
    const branch = buatBranch({
      branchId: "b3",
      branchName: "CK",
      tanggalMulaiOperasi: d("2026-06-01"),
      firstReportDate: d("2026-06-01"),
      // 1-6 Jul lapor normal, 7-8 Jul lapor tapi 0/0, 9-12 Jul TIDAK lapor sama sekali.
      currentPoints: buatPoints("CK", [...hariBerturut("2026-07-01", 6, 10), ...hariBerturut("2026-07-07", 2, 0)]),
    });
    const context = buatContext({ branches: [branch] });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(1);
    // expectedDays 1-13 Jul (eksklusif) = 12 hari, submitted = 8 hari (6 normal + 2 nol),
    // missing = 4 (9,10,11,12 Jul) - BUKAN 6 (kalau 0/0 salah dianggap missing).
    expect(hasil[0].comparisonValue).toBe(12);
    expect(hasil[0].metricValue).toBe(4);
  });

  it("4. tidak ada record dalam periode aktif dihitung missing", () => {
    const branch = buatBranch({
      branchId: "b4",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2020-01-01"),
      firstReportDate: d("2020-01-01"),
      currentPoints: [],
    });
    const context = buatContext({ branches: [branch] });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(1);
    expect(hasil[0].metricValue).toBe(hasil[0].comparisonValue); // semua hari missing
  });

  it("5. hari masa depan tidak dihitung (diklem ke 'besok' dari context.today)", () => {
    const branch = buatBranch({
      branchId: "b5",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2020-01-01"),
      firstReportDate: d("2020-01-01"),
      currentPoints: [],
    });
    // periodEnd jauh ke depan (20 Jul) tapi today masih 12 Jul -> besok 13 Jul.
    const context = buatContext({ branches: [branch], periodEnd: d("2026-07-20") });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(1);
    // expectedDays harus tetap 12 (1-13 Jul), bukan 19 (1-20 Jul).
    expect(hasil[0].comparisonValue).toBe(12);
  });

  it("6. ExpectedReportDays nol (tidak ada irisan operasional) tidak menghasilkan NaN/Infinity, cabang dilewati", () => {
    const branch = buatBranch({
      branchId: "b6",
      branchName: "AB 2",
      tanggalMulaiOperasi: d("2025-11-11"),
      tanggalTutupOperasi: d("2026-03-17"), // tutup jauh sebelum periode filter
      firstReportDate: d("2025-11-11"),
      currentPoints: [],
    });
    const context = buatContext({ branches: [branch] }); // periode filter Jul 2026, setelah tutup
    expect(() => generateDataCompletenessInsights(context)).not.toThrow();
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(0);
    for (const h of hasil) {
      expect(Number.isFinite(h.metricValue ?? 0)).toBe(true);
      expect(Number.isFinite(h.comparisonValue ?? 0)).toBe(true);
    }
  });
});
