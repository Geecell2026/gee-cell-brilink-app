import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyBranchMock = vi.fn();
const groupByMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    branch: { findMany: (...args: unknown[]) => findManyBranchMock(...args) },
    dailyTransaction: { groupBy: (...args: unknown[]) => groupByMock(...args) },
  },
}));

const fetchTransaksiPeriodeMock = vi.fn();
vi.mock("@/lib/calculations/dashboard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/calculations/dashboard")>("@/lib/calculations/dashboard");
  return {
    ...actual,
    fetchTransaksiPeriode: (...args: unknown[]) => fetchTransaksiPeriodeMock(...args),
  };
});

beforeEach(() => {
  findManyBranchMock.mockReset();
  groupByMock.mockReset();
  fetchTransaksiPeriodeMock.mockReset();
});

import { buildInsightContext } from "../context";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixtureTx(branchId: string, dateIso: string, totalTransaksi = 10): any {
  return {
    branchId,
    date: d(dateIso),
    brilinkPendapatan: 100_000,
    brilinkFee: 0,
    brilinkPengeluaran: 0,
    lainPendapatan: 0,
    lainPengeluaran: 0,
    asetPendapatan: 0,
    asetPengeluaran: 0,
    cleoJumlah: 0,
    cleoTipe: "PENDAPATAN",
    operasional: 0,
    gajiKasbon: 0,
    plusMinus: 0,
    saldoAwal: 0,
    tellerBreakdown: [{ tf: totalTransaksi, eWallet: 0, itTt: 0 }],
  };
}

// Matriks C.1/C.2/C.6 - buildInsightContext yang mengklem currentPoints ke
// periode operasional adalah mekanisme yang membuat rule Deteksi Anomali (dan
// Kelengkapan Data) otomatis benar tanpa perlu tahu apa itu "periode
// operasional" sendiri (lihat catatan di rules/branch-anomaly.ts v1.2.0).
describe("buildInsightContext - currentPoints diklem ke periode operasional (matriks C.1/C.2/C.6)", () => {
  it("baris transaksi sebelum tanggalMulaiOperasi dan setelah tanggalTutupOperasi dikeluarkan dari currentPoints", async () => {
    findManyBranchMock.mockResolvedValue([
      {
        id: "ab2",
        name: "AB 2",
        isActive: true,
        tanggalMulaiOperasi: d("2025-11-11"),
        tanggalTutupOperasi: d("2026-03-17"),
      },
    ]);
    groupByMock.mockResolvedValue([{ branchId: "ab2", _min: { date: d("2025-11-11") } }]);
    fetchTransaksiPeriodeMock.mockResolvedValue([
      fixtureTx("ab2", "2025-10-01"), // sebelum mulai (stray/data error) - harus dikeluarkan
      fixtureTx("ab2", "2026-03-15"), // dalam periode operasional
      fixtureTx("ab2", "2026-03-17"), // tepat di tanggalTutupOperasi - inklusif, harus TETAP masuk
      fixtureTx("ab2", "2026-03-20"), // setelah tutup (stray/data error) - harus dikeluarkan
    ]);

    const context = await buildInsightContext({
      startDate: d("2026-03-01"),
      endDate: d("2026-04-01"),
      comparisonMode: "SAMA_BULAN_LALU",
    });

    const branch = context.branches.find((b) => b.branchId === "ab2")!;
    const tanggal = branch.currentPoints.map((p) => p.date.toISOString().slice(0, 10));

    expect(tanggal).not.toContain("2025-10-01");
    expect(tanggal).toContain("2026-03-15");
    expect(tanggal).toContain("2026-03-17");
    expect(tanggal).not.toContain("2026-03-20");
  });

  it("cabang tetap muncul di context.branches walau isActive=false (histori tidak dihapus, section 3.B)", async () => {
    findManyBranchMock.mockResolvedValue([
      {
        id: "ab2",
        name: "AB 2",
        isActive: false,
        tanggalMulaiOperasi: d("2025-11-11"),
        tanggalTutupOperasi: d("2026-03-17"),
      },
    ]);
    groupByMock.mockResolvedValue([{ branchId: "ab2", _min: { date: d("2025-11-11") } }]);
    fetchTransaksiPeriodeMock.mockResolvedValue([fixtureTx("ab2", "2026-01-15")]);

    const context = await buildInsightContext({
      startDate: d("2026-01-01"),
      endDate: d("2026-02-01"),
      comparisonMode: "SAMA_BULAN_LALU",
    });

    const branch = context.branches.find((b) => b.branchId === "ab2");
    expect(branch).toBeDefined();
    expect(branch!.currentPoints.length).toBe(1);
  });
});
