import { beforeEach, describe, expect, it, vi } from "vitest";

const getRawTransaksiDataMock = vi.fn();
vi.mock("@/lib/analytics/data-source", () => ({
  getRawTransaksiData: (...args: unknown[]) => getRawTransaksiDataMock(...args),
}));

beforeEach(() => {
  getRawTransaksiDataMock.mockReset();
});

import { buildAnalisisData } from "@/lib/analytics/build-analisis-data";
import type { RawTx } from "@/lib/analytics/aggregation";

function tanggal(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// 35 hari berurutan (1 Jun - 5 Jul 2026), 1 baris/hari, 1 cabang - dipakai untuk
// membuktikan buffer MA look-back bekerja tanpa mengubah total window aktif.
function buatFixtureRentangPanjang(): RawTx[] {
  const rows: RawTx[] = [];
  const mulai = tanggal("2026-06-01");
  for (let i = 0; i < 35; i++) {
    const d = new Date(mulai.getTime() + i * 86400000);
    rows.push({ date: d, branchName: "Ekek", totalTransaksi: 10 + i });
  }
  return rows;
}

describe("buildAnalisisData - query dibatasi tanggal+cabang, bukan seluruh histori", () => {
  it("mengirim branchId, sejakTanggal, dan sampaiTanggal ke getRawTransaksiData (bukan fetch tanpa batas)", async () => {
    getRawTransaksiDataMock.mockResolvedValue([]);
    await buildAnalisisData(
      { branchId: "branch-ekek", startDate: tanggal("2026-07-01"), endDate: tanggal("2026-07-06") },
      null
    );

    expect(getRawTransaksiDataMock).toHaveBeenCalledTimes(1);
    const [branchId, sejakTanggal, sampaiTanggal] = getRawTransaksiDataMock.mock.calls[0];
    expect(branchId).toBe("branch-ekek");
    expect(sejakTanggal).toBeInstanceOf(Date);
    expect(sampaiTanggal).toEqual(tanggal("2026-07-06"));
    // sejakTanggal harus mundur dari awal window (bukan undefined/tanpa batas) -
    // mengambil yang lebih jauh antara buffer MA (30 hari) dan periode pembanding.
    expect(sejakTanggal!.getTime()).toBeLessThan(tanggal("2026-07-01").getTime());
  });

  it("tidak mengirim batas tanggal sama sekali kalau filter startDate/endDate kosong (fallback lama dipertahankan)", async () => {
    getRawTransaksiDataMock.mockResolvedValue([]);
    await buildAnalisisData({ branchId: "branch-ekek" }, null);
    const [, sejakTanggal, sampaiTanggal] = getRawTransaksiDataMock.mock.calls[0];
    expect(sejakTanggal).toBeUndefined();
    expect(sampaiTanggal).toBeUndefined();
  });
});

describe("buildAnalisisData - buffer MA tidak mengubah total/stats window aktif", () => {
  it("stats.total hanya menjumlahkan hari di window filter, bukan hari buffer", async () => {
    getRawTransaksiDataMock.mockResolvedValue(buatFixtureRentangPanjang());
    const data = await buildAnalisisData(
      { startDate: tanggal("2026-07-01"), endDate: tanggal("2026-07-06") },
      null
    );

    // Window aktif = 1-5 Jul (index 30-34 di fixture): nilai 40,41,42,43,44
    expect(data.points.length).toBe(5);
    expect(data.stats.total).toBe(40 + 41 + 42 + 43 + 44);
  });

  it("ma7/ma14 terisi (bukan null) di hari pertama window karena buffer look-back tersedia", async () => {
    getRawTransaksiDataMock.mockResolvedValue(buatFixtureRentangPanjang());
    const data = await buildAnalisisData(
      { startDate: tanggal("2026-07-01"), endDate: tanggal("2026-07-06") },
      null
    );

    // Tanpa buffer, index pertama window (hanya 5 titik) pasti null (butuh 7/14).
    // Dengan buffer 30 hari ke belakang, ma7 & ma14 di hari pertama window harus terisi.
    expect(data.ma7.length).toBe(5);
    expect(data.ma14.length).toBe(5);
    expect(data.ma7[0]).not.toBeNull();
    expect(data.ma14[0]).not.toBeNull();

    // ma7 hari pertama window (1 Jul, index fixture ke-30, nilai 40) = rata-rata
    // 7 nilai terakhir s.d. index 30 = index 24..30 = nilai 34..40.
    const expectedMa7 = (34 + 35 + 36 + 37 + 38 + 39 + 40) / 7;
    expect(data.ma7[0]).toBeCloseTo(expectedMa7);
  });

  it("ma7/ma14 tetap null kalau data buffer sungguhan tidak cukup (data baru mulai di awal window)", async () => {
    const rows: RawTx[] = buatFixtureRentangPanjang().slice(30); // cuma 1-5 Jul, tanpa histori sebelumnya
    getRawTransaksiDataMock.mockResolvedValue(rows);
    const data = await buildAnalisisData(
      { startDate: tanggal("2026-07-01"), endDate: tanggal("2026-07-06") },
      null
    );
    expect(data.ma7[0]).toBeNull();
    expect(data.ma14[0]).toBeNull();
  });

  it("hariFilter tetap selaras dengan ma7/ma14 (tidak mengacaukan index)", async () => {
    getRawTransaksiDataMock.mockResolvedValue(buatFixtureRentangPanjang());
    const data = await buildAnalisisData(
      { startDate: tanggal("2026-06-01"), endDate: tanggal("2026-07-06"), hariFilter: ["Senin"] },
      null
    );
    expect(data.ma7.length).toBe(data.points.length);
    expect(data.ma14.length).toBe(data.points.length);
  });
});
