export function jumlahHariDalamBulan(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function jumlahHariMinggu(year: number, month: number) {
  const totalHari = jumlahHariDalamBulan(year, month);
  let count = 0;
  for (let day = 1; day <= totalHari; day++) {
    if (new Date(year, month - 1, day).getDay() === 0) count++;
  }
  return count;
}

// Sesuai aturan: hari efektif kerja = total hari - jumlah hari Minggu.
export function hariEfektifKerja(year: number, month: number) {
  return jumlahHariDalamBulan(year, month) - jumlahHariMinggu(year, month);
}

export const JATAH_CUTI_PER_BULAN = 4;
