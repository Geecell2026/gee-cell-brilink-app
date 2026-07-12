import { describe, expect, it } from "vitest";
import { generateBranchAnomalyInsights } from "../rules/branch-anomaly";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

describe("generateBranchAnomalyInsights", () => {
  it("cabang dengan 0 transaksi berulang (>=3 hari) menghasilkan insight severity critical", () => {
    const points = buatPoints("Ekek", [
      { date: "2026-07-01", total: 50 },
      { date: "2026-07-02", total: 0 },
      { date: "2026-07-03", total: 48 },
      { date: "2026-07-04", total: 0 },
      { date: "2026-07-05", total: 52 },
      { date: "2026-07-06", total: 0 },
    ]);
    const context = buatContext({ branches: [buatBranch({ branchId: "b1", branchName: "Ekek", currentPoints: points })] });
    const hasil = generateBranchAnomalyInsights(context);

    const zeroInsight = hasil.find((h) => h.id.endsWith(":zero"));
    expect(zeroInsight).toBeDefined();
    expect(zeroInsight!.severity).toBe("critical");
    expect(zeroInsight!.entityName).toBe("Ekek");
    expect(zeroInsight!.message).toContain("Ekek");
    expect(zeroInsight!.message).toContain("3 dari 6");
  });

  it("laporan yang belum diinput (tidak ada baris sama sekali) TIDAK dianggap 0 transaksi - currentPoints memang cuma berisi hari yang sudah dilaporkan", () => {
    // Simulasikan cabang yang cuma melaporkan 2 dari 10 hari (8 hari lainnya
    // bukan "0 transaksi", tapi memang tidak ada baris DailyTransaction sama
    // sekali) - currentPoints HANYA berisi 2 titik yang benar-benar dilaporkan.
    const points = buatPoints("AB2", [
      { date: "2026-07-01", total: 5 },
      { date: "2026-07-02", total: 4 },
    ]);
    const context = buatContext({ branches: [buatBranch({ branchId: "b2", branchName: "AB2", currentPoints: points })] });
    const hasil = generateBranchAnomalyInsights(context);
    // Tidak ada satupun titik dengan totalTransaksi === 0 di antara yang dilaporkan,
    // jadi tidak boleh muncul insight "0 transaksi" untuk cabang ini.
    expect(hasil.find((h) => h.id.endsWith(":zero"))).toBeUndefined();
  });

  it("1 kali 0 transaksi pada cabang dengan rata-rata sangat kecil TIDAK menghasilkan insight berlebihan", () => {
    const points = buatPoints("Paseh", [
      { date: "2026-07-01", total: 2 },
      { date: "2026-07-02", total: 1 },
      { date: "2026-07-03", total: 0 },
    ]);
    const context = buatContext({ branches: [buatBranch({ branchId: "b3", branchName: "Paseh", currentPoints: points })] });
    const hasil = generateBranchAnomalyInsights(context);
    expect(hasil.find((h) => h.id.endsWith(":zero"))).toBeUndefined();
  });

  it("data kosong (belum ada laporan sama sekali) aman, tidak error dan tidak menghasilkan insight", () => {
    const context = buatContext({ branches: [buatBranch({ branchId: "b4", branchName: "CK", currentPoints: [] })] });
    expect(() => generateBranchAnomalyInsights(context)).not.toThrow();
    expect(generateBranchAnomalyInsights(context)).toEqual([]);
  });

  it("stable id sama untuk input yang sama (bukan acak)", () => {
    const points = buatPoints("Ekek", [
      { date: "2026-07-01", total: 50 },
      { date: "2026-07-02", total: 0 },
      { date: "2026-07-03", total: 0 },
      { date: "2026-07-04", total: 0 },
    ]);
    const context = buatContext({ branches: [buatBranch({ branchId: "b1", branchName: "Ekek", currentPoints: points })] });
    const a = generateBranchAnomalyInsights(context);
    const b = generateBranchAnomalyInsights(context);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });
});
