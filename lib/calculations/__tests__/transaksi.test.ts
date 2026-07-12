import { describe, expect, it } from "vitest";
import { hitungSaldoAkhir, hitungTotalPendapatan, hitungTotalPengeluaran } from "@/lib/calculations/transaksi";

function baseTx(overrides: Partial<Parameters<typeof hitungSaldoAkhir>[0]> = {}) {
  return {
    brilinkPendapatan: 100_000,
    brilinkFee: 10_000,
    brilinkPengeluaran: 0,
    lainPendapatan: 0,
    lainPengeluaran: 0,
    asetPendapatan: 0,
    asetPengeluaran: 0,
    cleoJumlah: 0,
    cleoTipe: "PENDAPATAN" as const,
    operasional: 0,
    gajiKasbon: 0,
    plusMinus: 0,
    saldoAwal: 1_000_000,
    ...overrides,
  };
}

describe("hitungTotalPendapatan (Ekek)", () => {
  it("menjumlahkan brilinkPendapatan + brilinkFee + lain + aset", () => {
    const tx = baseTx({ lainPendapatan: 5_000, asetPendapatan: 2_000 });
    expect(hitungTotalPendapatan(tx)).toBe(100_000 + 10_000 + 5_000 + 2_000);
  });

  it("Cleo Member Struk bertipe PENDAPATAN ikut masuk pendapatan", () => {
    const tx = baseTx({ cleoJumlah: 50_000, cleoTipe: "PENDAPATAN" });
    expect(hitungTotalPendapatan(tx)).toBe(100_000 + 10_000 + 50_000);
  });

  it("Cleo Member Struk bertipe PENGELUARAN tidak masuk pendapatan", () => {
    const tx = baseTx({ cleoJumlah: 50_000, cleoTipe: "PENGELUARAN" });
    expect(hitungTotalPendapatan(tx)).toBe(100_000 + 10_000);
  });
});

describe("hitungTotalPengeluaran (Ekek)", () => {
  it("menjumlahkan brilinkPengeluaran + lain + aset + operasional + gajiKasbon", () => {
    const tx = baseTx({
      brilinkPengeluaran: 8_000,
      lainPengeluaran: 3_000,
      asetPengeluaran: 1_000,
      operasional: 20_000,
      gajiKasbon: 15_000,
    });
    expect(hitungTotalPengeluaran(tx)).toBe(8_000 + 3_000 + 1_000 + 20_000 + 15_000);
  });

  it("Cleo Member Struk bertipe PENGELUARAN ikut masuk pengeluaran", () => {
    const tx = baseTx({ cleoJumlah: 25_000, cleoTipe: "PENGELUARAN" });
    expect(hitungTotalPengeluaran(tx)).toBe(25_000);
  });

  it("Cleo Member Struk bertipe PENDAPATAN tidak masuk pengeluaran", () => {
    const tx = baseTx({ cleoJumlah: 25_000, cleoTipe: "PENDAPATAN" });
    expect(hitungTotalPengeluaran(tx)).toBe(0);
  });
});

describe("hitungSaldoAkhir (Ekek)", () => {
  it("Saldo Akhir = Saldo Awal + Pendapatan - Pengeluaran + Plus Minus", () => {
    const tx = baseTx({ plusMinus: 5_000 });
    const expected = 1_000_000 + (100_000 + 10_000) - 0 + 5_000;
    expect(hitungSaldoAkhir(tx)).toBe(expected);
  });

  it("Plus Minus negatif mengurangi Saldo Akhir", () => {
    const tanpaMinus = hitungSaldoAkhir(baseTx({ plusMinus: 0 }));
    const denganMinus = hitungSaldoAkhir(baseTx({ plusMinus: -20_000 }));
    expect(denganMinus).toBe(tanpaMinus - 20_000);
  });
});
