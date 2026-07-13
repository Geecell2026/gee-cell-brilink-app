import { describe, expect, it } from "vitest";
import { generateBranchTrendContributionInsights } from "../rules/branch-trend-contribution";
import { buatBranch, buatContext } from "./test-helpers";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// Konteks default helper: periode aktif 1-12 Jul 2026, pembanding 1-12 Jun 2026.
describe("Kontribusi Tren - like-for-like (matriks D)", () => {
  it("2&5. cabang yang tutup SEBELUM periode aktif tidak dianggap 'turun ke nol' dan tidak jadi top-contributor penurunan", () => {
    const ekek = buatBranch({
      branchId: "ekek",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2022-01-01"),
      currentPendapatan: 9_000_000,
      previousPendapatan: 10_000_000, // turun 1jt - performa nyata
    });
    const ab2 = buatBranch({
      branchId: "ab2",
      branchName: "AB 2",
      tanggalMulaiOperasi: d("2025-11-11"),
      tanggalTutupOperasi: d("2026-06-20"), // tutup di tengah periode pembanding (Juni) - tidak operasional lagi di Juli
      currentPendapatan: 0,
      previousPendapatan: 5_000_000, // masih beroperasi penuh di Juni
    });
    const context = buatContext({ branches: [ekek, ab2] });

    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil.length).toBe(1);
    // Top attribution HARUS Ekek (cabang like-for-like), BUKAN AB2 walau AB2
    // secara nominal "turun" lebih besar (5jt vs 1jt) - itu penurunan karena tutup, bukan performa.
    expect(hasil[0].entityName).toBe("Ekek");
    expect(hasil[0].message).toContain("like-for-like");
  });

  it("4. perubahan jumlah cabang operasional menghasilkan catatan struktural terpisah", () => {
    const ekek = buatBranch({
      branchId: "ekek",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2022-01-01"),
      currentPendapatan: 9_000_000,
      previousPendapatan: 10_000_000,
    });
    const ab2 = buatBranch({
      branchId: "ab2",
      branchName: "AB 2",
      tanggalMulaiOperasi: d("2025-11-11"),
      tanggalTutupOperasi: d("2026-06-20"),
      currentPendapatan: 0,
      previousPendapatan: 5_000_000,
    });
    const context = buatContext({ branches: [ekek, ab2] });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil[0].message).toContain("berkurang dari 2 menjadi 1");
    expect(hasil[0].message).toContain("AB 2");
  });

  it("3. cabang baru tidak dianggap 'mendorong pertumbuhan' tanpa konteks like-for-like", () => {
    const ekek = buatBranch({
      branchId: "ekek",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2022-01-01"),
      currentPendapatan: 10_500_000,
      previousPendapatan: 10_000_000, // tumbuh wajar +500rb
    });
    const paseh = buatBranch({
      branchId: "paseh",
      branchName: "Paseh",
      tanggalMulaiOperasi: d("2026-07-05"), // baru mulai DI DALAM periode aktif, belum ada di Juni
      currentPendapatan: 6_000_000,
      previousPendapatan: 0,
    });
    const context = buatContext({ branches: [ekek, paseh] });

    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil.length).toBe(1);
    // Top attribution pertumbuhan HARUS Ekek (like-for-like), bukan Paseh yang
    // "tumbuh dari nol" cuma karena baru buka.
    expect(hasil[0].entityName).toBe("Ekek");
    expect(hasil[0].message).toContain("Paseh baru mulai beroperasi");
    expect(hasil[0].message).toContain("tidak dimasukkan dalam perbandingan like-for-like");
  });

  it("6. Total aktual wilayah dan like-for-like ditampilkan sebagai dua angka terpisah, tidak tercampur", () => {
    const ekek = buatBranch({
      branchId: "ekek",
      branchName: "Ekek",
      tanggalMulaiOperasi: d("2022-01-01"),
      currentPendapatan: 9_000_000,
      previousPendapatan: 10_000_000,
    });
    const ab2 = buatBranch({
      branchId: "ab2",
      branchName: "AB 2",
      tanggalMulaiOperasi: d("2025-11-11"),
      tanggalTutupOperasi: d("2026-06-20"),
      currentPendapatan: 0,
      previousPendapatan: 5_000_000,
    });
    const context = buatContext({ branches: [ekek, ab2] });
    const hasil = generateBranchTrendContributionInsights(context);
    // Total wilayah: (9jt) vs (15jt) = turun 40% -> judul pakai angka INI (tidak difilter).
    expect(hasil[0].title).toContain("40");
    // Like-for-like: (9jt) vs (10jt) = turun 10% -> kalimat like-for-like pakai angka BERBEDA.
    expect(hasil[0].message).toContain("10.0%");
  });

  it("7. status isActive terkini TIDAK menghapus data historis dari perbandingan like-for-like", () => {
    const ekek = buatBranch({
      branchId: "ekek",
      branchName: "Ekek",
      isActive: false, // nonaktif SEKARANG, tapi tetap operasional historis di kedua periode
      tanggalMulaiOperasi: d("2022-01-01"),
      tanggalTutupOperasi: null,
      currentPendapatan: 8_000_000,
      previousPendapatan: 10_000_000,
    });
    const context = buatContext({ branches: [ekek] });
    const hasil = generateBranchTrendContributionInsights(context);
    expect(hasil.length).toBe(1);
    expect(hasil[0].entityName).toBe("Ekek");
    expect(hasil[0].message).toContain("like-for-like");
  });
});
