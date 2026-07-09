import { db } from "@/lib/db";
import { hariEfektifKerja } from "@/lib/calculations/kalender";

export type PayrollDraft = {
  employeeId: string;
  employeeName: string;
  periodYear: number;
  periodMonth: number;
  gajiPokokSnapshot: number;
  hariEfektifKerja: number;
  totalMasuk: number;
  hariLembur: number;
  gajiPerHari: number;
  gajiPokokProrata: number;
  gajiLembur: number;
  totalKasbonDipotong: number;
  totalGajiKotor: number;
  sisaGaji: number;
};

// Rumus dikonfirmasi user 2026-07-08:
// - Hari efektif kerja = total hari bulan - jumlah hari Minggu.
// - Gaji per hari = gaji pokok / hari efektif kerja.
// - Total Masuk = hanya hari berstatus HADIR (Cuti dalam kuota tetap mengurangi gaji, diperlakukan sama seperti Alpha).
// - Jika Total Masuk > hari efektif kerja, selisihnya dihitung sebagai lembur dengan tarif yang sama.
export async function hitungDraftPayroll(
  employeeId: string,
  periodYear: number,
  periodMonth: number
): Promise<PayrollDraft | null> {
  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const monthStart = new Date(periodYear, periodMonth - 1, 1);
  const monthEnd = new Date(periodYear, periodMonth, 1);

  const totalMasuk = await db.attendance.count({
    where: { employeeId, status: "HADIR", date: { gte: monthStart, lt: monthEnd } },
  });

  const kasbonAgg = await db.kasbon.aggregate({
    where: { employeeId, date: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });

  const efektif = hariEfektifKerja(periodYear, periodMonth);
  const gajiPokok = Number(employee.gajiPokok);
  const gajiPerHari = efektif > 0 ? gajiPokok / efektif : 0;

  const hariKerjaNormal = Math.min(totalMasuk, efektif);
  const hariLembur = Math.max(0, totalMasuk - efektif);

  const gajiPokokProrata = hariKerjaNormal * gajiPerHari;
  const gajiLembur = hariLembur * gajiPerHari;
  const totalKasbonDipotong = Number(kasbonAgg._sum.amount ?? 0);
  const totalGajiKotor = gajiPokokProrata + gajiLembur;
  const sisaGaji = totalGajiKotor - totalKasbonDipotong;

  return {
    employeeId,
    employeeName: employee.name,
    periodYear,
    periodMonth,
    gajiPokokSnapshot: gajiPokok,
    hariEfektifKerja: efektif,
    totalMasuk,
    hariLembur,
    gajiPerHari,
    gajiPokokProrata,
    gajiLembur,
    totalKasbonDipotong,
    totalGajiKotor,
    sisaGaji,
  };
}
