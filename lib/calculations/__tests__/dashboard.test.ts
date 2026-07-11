import { describe, expect, it } from "vitest";
import { hitungPendapatanBiayaLaba, hitungTransaksiBreakdown, buatGrowth } from "@/lib/calculations/dashboard";

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
