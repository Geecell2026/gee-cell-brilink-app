export function parseRupiah(value: string | undefined): number {
  if (!value) return 0;
  const trimmed = value.toString().trim();
  if (!trimmed) return 0;
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return negative ? -n : n;
}

const BULAN_ID: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MEI: 4, JUN: 5,
  JUL: 6, AGU: 7, SEP: 8, OKT: 9, NOV: 10, DES: 11,
};

// Format "Rabu, 10 Des 25" (dipakai di sheet CK, beda dari branch lain).
function parseTanggalIndonesia(trimmed: string): Date | null {
  const withoutDay = trimmed.includes(",") ? trimmed.split(",")[1].trim() : trimmed;
  const m = withoutDay.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (!m) return null;
  const [, d, bulanStr, yStr] = m;
  const bulan = BULAN_ID[bulanStr.toUpperCase().slice(0, 3)];
  if (bulan === undefined) return null;
  const year = yStr.length === 2 ? 2000 + Number(yStr) : Number(yStr);
  return new Date(year, bulan, Number(d));
}

export function parseTanggalDDMMYYYY(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;

  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, yStr] = m;
    const year = yStr.length === 2 ? 2000 + Number(yStr) : Number(yStr);
    return new Date(year, Number(mo) - 1, Number(d));
  }

  return parseTanggalIndonesia(trimmed);
}

export function forwardFillTop(row1: string[], width: number): string[] {
  const filled: string[] = [];
  let last = "";
  for (let i = 0; i < width; i++) {
    const cell = (row1[i] ?? "").toString().trim().toUpperCase();
    if (cell) last = cell;
    filled.push(last);
  }
  return filled;
}

// Cari kolom berdasarkan header atas (top, sudah forward-fill karena merged cell)
// DAN header bawah (sub) secara terpisah, supaya tidak salah tangkap seperti
// "ASET & FEE" (top) yang mengandung kata "FEE" ikut menular ke sub-kolom "Ket".
export function findColumnBySection(
  top: string[],
  row2: string[],
  topPredicate: (t: string) => boolean,
  subPredicate: (s: string) => boolean
): number {
  for (let i = 0; i < top.length; i++) {
    if (topPredicate(top[i]) && subPredicate((row2[i] ?? "").toString().trim().toUpperCase())) {
      return i;
    }
  }
  return -1;
}

export function findColumnByTopOnly(top: string[], predicate: (t: string) => boolean): number {
  return top.findIndex(predicate);
}
