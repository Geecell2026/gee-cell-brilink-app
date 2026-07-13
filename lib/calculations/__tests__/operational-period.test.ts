import { describe, expect, it } from "vitest";
import {
  isBranchOperationalOnDate,
  isBranchOperationalDuringRange,
  getOperationalRangeIntersection,
  countOperationalDaysInRange,
  isBranchConfigIncomplete,
} from "@/lib/calculations/operational-period";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("isBranchOperationalOnDate - matriks A", () => {
  it("1. tanggal sebelum mulai -> exclude", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-10"), tanggalTutupOperasi: null };
    expect(isBranchOperationalOnDate(b, d("2026-01-09"))).toBe(false);
  });

  it("2. tanggal sama dengan mulai -> include", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-10"), tanggalTutupOperasi: null };
    expect(isBranchOperationalOnDate(b, d("2026-01-10"))).toBe(true);
  });

  it("3. tanggal sama dengan tutup -> include", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-10"), tanggalTutupOperasi: d("2026-03-17") };
    expect(isBranchOperationalOnDate(b, d("2026-03-17"))).toBe(true);
  });

  it("4. tanggal setelah tutup -> exclude", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-10"), tanggalTutupOperasi: d("2026-03-17") };
    expect(isBranchOperationalOnDate(b, d("2026-03-18"))).toBe(false);
  });

  it("5. tanggal tutup null -> tetap aktif setelah mulai (tanpa batas atas)", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-10"), tanggalTutupOperasi: null };
    expect(isBranchOperationalOnDate(b, d("2030-01-01"))).toBe(true);
  });

  it("6. tanggal mulai null -> fallback ke fallbackStart", () => {
    const b = { tanggalMulaiOperasi: null, tanggalTutupOperasi: null };
    expect(isBranchOperationalOnDate(b, d("2026-01-05"), d("2026-01-10"))).toBe(false);
    expect(isBranchOperationalOnDate(b, d("2026-01-10"), d("2026-01-10"))).toBe(true);
  });

  it("6b. tanggal mulai null tanpa fallbackStart -> tidak ada batas bawah (jangan menebak)", () => {
    const b = { tanggalMulaiOperasi: null, tanggalTutupOperasi: null };
    expect(isBranchOperationalOnDate(b, d("1990-01-01"))).toBe(true);
  });

  it("7. status Nonaktif tidak menghapus periode historis sebelum tanggal tutup (isBranchOperationalOnDate tidak menerima isActive sama sekali)", () => {
    const b = { tanggalMulaiOperasi: d("2025-11-11"), tanggalTutupOperasi: d("2026-03-17") };
    expect(isBranchOperationalOnDate(b, d("2026-01-01"))).toBe(true);
  });
});

describe("isBranchConfigIncomplete - matriks A.8 & G", () => {
  it("8. status Nonaktif dan tanggal tutup null -> konfigurasi belum lengkap (warning)", () => {
    expect(isBranchConfigIncomplete({ isActive: false, tanggalTutupOperasi: null })).toBe(true);
  });

  it("Nonaktif dengan tanggal tutup terisi -> konfigurasi lengkap, tidak warning", () => {
    expect(isBranchConfigIncomplete({ isActive: false, tanggalTutupOperasi: d("2026-03-17") })).toBe(false);
  });

  it("Aktif tanpa tanggal tutup -> tidak warning (wajar, masih berjalan)", () => {
    expect(isBranchConfigIncomplete({ isActive: true, tanggalTutupOperasi: null })).toBe(false);
  });
});

describe("isBranchOperationalDuringRange - matriks A.9 & A.10 (Total Cabang Aktif historis)", () => {
  it("9. range historis beririsan dengan periode operasi -> cabang dianggap aktif pada range tersebut", () => {
    const b = { tanggalMulaiOperasi: d("2025-11-11"), tanggalTutupOperasi: d("2026-03-17") };
    expect(isBranchOperationalDuringRange(b, d("2026-01-01"), d("2026-02-01"))).toBe(true);
  });

  it("10. range setelah tanggal tutup -> cabang tidak aktif", () => {
    const b = { tanggalMulaiOperasi: d("2025-11-11"), tanggalTutupOperasi: d("2026-03-17") };
    expect(isBranchOperationalDuringRange(b, d("2026-04-01"), d("2026-05-01"))).toBe(false);
  });

  it("range sebelum tanggal mulai -> cabang tidak aktif", () => {
    const b = { tanggalMulaiOperasi: d("2026-02-24"), tanggalTutupOperasi: null };
    expect(isBranchOperationalDuringRange(b, d("2026-01-01"), d("2026-02-01"))).toBe(false);
  });

  it("range sebagian beririsan dengan tanggal tutup di tengah range -> tetap dianggap aktif (ada irisan)", () => {
    const b = { tanggalMulaiOperasi: d("2025-11-11"), tanggalTutupOperasi: d("2026-03-17") };
    // range 1 Mar - 1 Apr, tutup 17 Mar - beririsan 1-17 Mar.
    expect(isBranchOperationalDuringRange(b, d("2026-03-01"), d("2026-04-01"))).toBe(true);
  });
});

describe("getOperationalRangeIntersection & countOperationalDaysInRange", () => {
  it("mengembalikan null kalau tidak ada irisan sama sekali", () => {
    const b = { tanggalMulaiOperasi: d("2026-02-24"), tanggalTutupOperasi: null };
    expect(getOperationalRangeIntersection(b, d("2026-01-01"), d("2026-02-01"))).toBeNull();
  });

  it("irisan diklem ke tanggalTutupOperasi+1 (eksklusif) kalau range filter lebih panjang", () => {
    const b = { tanggalMulaiOperasi: d("2025-11-11"), tanggalTutupOperasi: d("2026-03-17") };
    const r = getOperationalRangeIntersection(b, d("2026-03-01"), d("2026-04-01"));
    expect(r).not.toBeNull();
    expect(r!.start).toEqual(d("2026-03-01"));
    expect(r!.end).toEqual(d("2026-03-18")); // eksklusif, hari setelah 17 Maret
  });

  it("countOperationalDaysInRange = 0 kalau tidak ada irisan (bukan NaN/negatif)", () => {
    const b = { tanggalMulaiOperasi: d("2026-02-24"), tanggalTutupOperasi: null };
    const n = countOperationalDaysInRange(b, d("2026-01-01"), d("2026-02-01"));
    expect(n).toBe(0);
    expect(Number.isNaN(n)).toBe(false);
  });

  it("countOperationalDaysInRange menghitung jumlah hari irisan yang benar", () => {
    const b = { tanggalMulaiOperasi: d("2026-01-01"), tanggalTutupOperasi: null };
    expect(countOperationalDaysInRange(b, d("2026-01-05"), d("2026-01-15"))).toBe(10);
  });
});
