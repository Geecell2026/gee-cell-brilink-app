import { describe, expect, it } from "vitest";
import { generateDataCompletenessInsights } from "../rules/data-completeness";
import { isBranchOperationalOnDate, isBranchOperationalDuringRange } from "@/lib/calculations/operational-period";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// Matriks F - AB2 (Cabang "AB 2"), tanggal terverifikasi langsung dari database
// dev 2026-07-13: mulai 2025-11-11, hari operasional TERAKHIR 2026-03-17
// (baris itu berisi transaksi asli Rp15.000, BUKAN baris kosong) - jadi
// tanggalTutupOperasi = 2026-03-17, BUKAN 2026-03-16 seperti dugaan awal spec.
const AB2_MULAI = d("2025-11-11");
const AB2_TUTUP = d("2026-03-17");

describe("Skenario AB2 - tanggalMulaiOperasi=2025-11-11, tanggalTutupOperasi=2026-03-17", () => {
  it("F.3. AB2 sebelum tanggal mulai (2025-10-01) tidak operasional", () => {
    expect(isBranchOperationalOnDate({ tanggalMulaiOperasi: AB2_MULAI, tanggalTutupOperasi: AB2_TUTUP }, d("2025-10-01"))).toBe(
      false
    );
  });

  it("F.3. AB2 tepat di tanggal tutup (2026-03-17) MASIH operasional (inklusif)", () => {
    expect(isBranchOperationalOnDate({ tanggalMulaiOperasi: AB2_MULAI, tanggalTutupOperasi: AB2_TUTUP }, AB2_TUTUP)).toBe(true);
  });

  it("F.4. setelah tanggal tutup (2026-03-18 dst) AB2 tidak menghasilkan missing report", () => {
    const branch = buatBranch({
      branchId: "ab2",
      branchName: "AB 2",
      tanggalMulaiOperasi: AB2_MULAI,
      tanggalTutupOperasi: AB2_TUTUP,
      firstReportDate: AB2_MULAI,
      currentPoints: [], // tidak ada laporan di April - memang sudah tutup, bukan "hilang"
    });
    const context = buatContext({
      branches: [branch],
      periodStart: d("2026-04-01"),
      periodEnd: d("2026-05-01"),
      today: d("2026-04-30"),
    });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(0);
  });

  it("F.5&6. April 2026 (setelah tutup) tidak dianggap AB2 operasional untuk Total Cabang Aktif", () => {
    expect(
      isBranchOperationalDuringRange({ tanggalMulaiOperasi: AB2_MULAI, tanggalTutupOperasi: AB2_TUTUP }, d("2026-04-01"), d("2026-05-01"))
    ).toBe(false);
  });

  it("F.7. data SEBELUM tanggal tutup (Januari 2026) tetap masuk laporan historis dan bisa dievaluasi Kelengkapan Data", () => {
    const branch = buatBranch({
      branchId: "ab2",
      branchName: "AB 2",
      tanggalMulaiOperasi: AB2_MULAI,
      tanggalTutupOperasi: AB2_TUTUP,
      firstReportDate: AB2_MULAI,
      // Hanya lapor 25 dari 31 hari Januari - 6 hari bolong DALAM periode operasional.
      currentPoints: buatPoints(
        "AB 2",
        Array.from({ length: 31 }, (_, i) => i + 1)
          .filter((tgl) => tgl <= 25)
          .map((tgl) => ({ date: `2026-01-${String(tgl).padStart(2, "0")}`, total: 5 }))
      ),
    });
    const context = buatContext({
      branches: [branch],
      periodStart: d("2026-01-01"),
      periodEnd: d("2026-02-01"),
      today: d("2026-06-01"),
    });
    const hasil = generateDataCompletenessInsights(context);
    expect(hasil.length).toBe(1);
    expect(hasil[0].comparisonValue).toBe(31); // seluruh Januari ada dalam periode operasional
    expect(hasil[0].metricValue).toBe(6); // 26-31 Jan bolong
  });
});
