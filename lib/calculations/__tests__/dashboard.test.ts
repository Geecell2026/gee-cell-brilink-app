import { describe, expect, it } from "vitest";
import { hitungPendapatanBiayaLaba, hitungTransaksiBreakdown, buatGrowth, tentukanStatusCabang } from "@/lib/calculations/dashboard";

// Fixture minimal - cuma field yang benar-benar dipakai hitungPendapatanBiayaLaba/
// hitungTransaksiBreakdown, di-cast karena tipe aslinya (hasil query Prisma
// lengkap dengan relasi branch) tidak relevan untuk test murni ini.
function fixtureTx(overrides: {
  brilinkPendapatan?: number;
  brilinkFee?: number;
  operasional?: number;
  tellerBreakdown?: { tf: number; eWallet: number; itTt: number }[];
}) {
  return {
    brilinkPendapatan: overrides.brilinkPendapatan ?? 0,
    brilinkFee: overrides.brilinkFee ?? 0,
    brilinkPengeluaran: 0,
    lainPendapatan: 0,
    lainPengeluaran: 0,
    asetPendapatan: 0,
    asetPengeluaran: 0,
    cleoJumlah: 0,
    cleoTipe: "PENDAPATAN" as const,
    operasional: overrides.operasional ?? 0,
    gajiKasbon: 0,
    plusMinus: 0,
    saldoAwal: 0,
    tellerBreakdown: overrides.tellerBreakdown ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("hitungTransaksiBreakdown - Total Transaksi bukan jumlah baris laporan", () => {
  it("Total Transaksi = jumlah tf+eWallet+itTt dari TransactionTellerBreakdown, bukan banyaknya hari yang dilaporkan", () => {
    // 2 baris laporan (2 hari), tapi masing-masing punya beberapa baris teller.
    const transaksi = [
      fixtureTx({ tellerBreakdown: [{ tf: 10, eWallet: 5, itTt: 2 }, { tf: 3, eWallet: 1, itTt: 0 }] }),
      fixtureTx({ tellerBreakdown: [{ tf: 7, eWallet: 4, itTt: 6 }] }),
    ];
    const hasil = hitungTransaksiBreakdown(transaksi);
    // total dari teller = (10+3+7) + (5+1+4) + (2+0+6) = 20 + 10 + 8 = 38
    expect(hasil.transfer).toBe(20);
    expect(hasil.eWallet).toBe(10);
    expect(hasil.tarikTunai).toBe(8);
    expect(hasil.totalTransaksi).toBe(38);
    // BUKAN transaksi.length (yang cuma 2, jumlah baris laporan harian).
    expect(hasil.totalTransaksi).not.toBe(transaksi.length);
  });

  it("hari tanpa breakdown teller (belum diisi) tidak menyumbang total transaksi", () => {
    const transaksi = [fixtureTx({}), fixtureTx({ tellerBreakdown: [{ tf: 5, eWallet: 0, itTt: 0 }] })];
    const hasil = hitungTransaksiBreakdown(transaksi);
    expect(hasil.totalTransaksi).toBe(5);
  });
});

describe("hitungPendapatanBiayaLaba", () => {
  it("laba = pendapatan - biaya, margin dihitung dari pendapatan", () => {
    const transaksi = [fixtureTx({ brilinkPendapatan: 100_000, brilinkFee: 20_000, operasional: 30_000 })];
    const hasil = hitungPendapatanBiayaLaba(transaksi);
    expect(hasil.pendapatan).toBe(120_000);
    expect(hasil.biaya).toBe(30_000);
    expect(hasil.laba).toBe(90_000);
    expect(hasil.margin).toBeCloseTo((90_000 / 120_000) * 100);
  });

  it("margin null (bukan Infinity/NaN) saat pendapatan 0", () => {
    const transaksi = [fixtureTx({ brilinkPendapatan: 0, brilinkFee: 0, operasional: 10_000 })];
    const hasil = hitungPendapatanBiayaLaba(transaksi);
    expect(hasil.margin).toBeNull();
    expect(Number.isNaN(hasil.laba)).toBe(false);
  });
});

describe("tentukanStatusCabang - matriks E & G (periode operasional)", () => {
  const dasar = {
    hariLaporanTerinput: 20,
    kelengkapanDataPersen: 95,
    laba: 1_000_000,
    margin: 20,
    pertumbuhanPendapatan: 5,
  };

  it("E.8 & G.1. beroperasi pada periode + status Aktif -> dinilai normal (bukan Belum Beroperasi)", () => {
    const hasil = tentukanStatusCabang({ ...dasar, beroperasiPadaPeriode: true, statusTidakBeroperasi: null });
    expect(hasil.status).not.toBe("Belum Beroperasi");
  });

  it("E.8. cabang belum mulai beroperasi pada periode ini -> status Belum Beroperasi, BUKAN dinilai nol", () => {
    const hasil = tentukanStatusCabang({
      ...dasar,
      hariLaporanTerinput: 0,
      kelengkapanDataPersen: null,
      laba: 0,
      margin: null,
      pertumbuhanPendapatan: null,
      beroperasiPadaPeriode: false,
      statusTidakBeroperasi: "belum_mulai",
    });
    expect(hasil.status).toBe("Belum Beroperasi");
    expect(hasil.alasan).toContain("belum mulai beroperasi");
  });

  it("F.4-6 (AB2) & G.2. cabang sudah tutup pada periode ini -> status Belum Beroperasi (alasan sudah tutup), bukan Perlu Evaluasi/Data Belum Cukup", () => {
    const hasil = tentukanStatusCabang({
      ...dasar,
      hariLaporanTerinput: 0,
      kelengkapanDataPersen: null,
      laba: 0,
      margin: null,
      pertumbuhanPendapatan: null,
      beroperasiPadaPeriode: false,
      statusTidakBeroperasi: "sudah_tutup",
    });
    expect(hasil.status).toBe("Belum Beroperasi");
    expect(hasil.alasan).toContain("berhenti beroperasi");
  });

  it("G.2. status Nonaktif SEKARANG tapi beroperasi pada periode historis yang diminta -> tetap dinilai normal (histori tidak dihapus)", () => {
    // beroperasiPadaPeriode dihitung dari tanggalMulaiOperasi/tanggalTutupOperasi
    // (section 12) - fungsi ini TIDAK menerima isActive sama sekali, jadi status
    // Nonaktif terkini tidak bisa memaksa cabang jadi "Belum Beroperasi" untuk
    // periode yang secara historis valid.
    const hasil = tentukanStatusCabang({ ...dasar, beroperasiPadaPeriode: true, statusTidakBeroperasi: null });
    expect(hasil.status).not.toBe("Belum Beroperasi");
  });

  it("E.7. denominator kelengkapan nol (null) -> tetap dinilai lewat jalur 'Data Belum Cukup', bukan skor nol/negatif", () => {
    const hasil = tentukanStatusCabang({
      ...dasar,
      hariLaporanTerinput: 0,
      kelengkapanDataPersen: null,
      beroperasiPadaPeriode: true,
      statusTidakBeroperasi: null,
    });
    expect(hasil.status).toBe("Data Belum Cukup");
  });
});

describe("buatGrowth - null vs 0 dibedakan, tidak pernah NaN/Infinity", () => {
  it("periode sebelumnya null -> 'Belum dapat dibandingkan'", () => {
    const g = buatGrowth(100, null);
    expect(g.persen).toBeNull();
    expect(g.label).toBe("Belum dapat dibandingkan");
  });

  it("periode sebelumnya 0 -> 'Belum dapat dibandingkan' (bukan Infinity%)", () => {
    const g = buatGrowth(100, 0);
    expect(g.persen).toBeNull();
    expect(Number.isFinite(g.persen ?? 0)).toBe(true);
  });

  it("periode sebelumnya angka wajar -> persen dihitung benar", () => {
    const g = buatGrowth(150, 100);
    expect(g.persen).toBeCloseTo(50);
  });
});
