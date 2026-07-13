// Sumber kebenaran TUNGGAL untuk "apakah cabang X operasional pada tanggal Y" -
// dipakai lib/insights/context.ts, rules/data-completeness.ts, rules/branch-anomaly.ts,
// rules/branch-trend-contribution.ts, dan lib/calculations/dashboard.ts. Jangan
// duplikasi logic ini di tempat lain.
//
// Definisi (disepakati dengan owner, lihat audit 2026-07-13):
// - tanggalMulaiOperasi null = tanggal mulai belum diketahui -> pakai fallbackStart
//   (biasanya tanggal laporan pertama) kalau tersedia, kalau tidak ada juga berarti
//   tidak ada batas bawah (jangan menebak, jangan mengecualikan histori).
// - tanggalTutupOperasi null = belum tercatat tutup permanen (masih berjalan tanpa batas atas).
// - tanggalTutupOperasi adalah HARI OPERASIONAL TERAKHIR (inklusif), bukan hari pertama tutup.
// - Status isActive HANYA kondisi terkini (bukan time-versioned) - TIDAK dipakai
//   di sini untuk mengecualikan tanggal historis. Dipakai terpisah oleh caller
//   hanya untuk mendeteksi "konfigurasi belum lengkap" (lihat isBranchConfigIncomplete).
export type BranchOperationalMeta = {
  tanggalMulaiOperasi: Date | null;
  tanggalTutupOperasi: Date | null;
};

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function effectiveStart(branch: BranchOperationalMeta, fallbackStart: Date | null): Date | null {
  if (branch.tanggalMulaiOperasi) return toUtcMidnight(branch.tanggalMulaiOperasi);
  if (fallbackStart) return toUtcMidnight(fallbackStart);
  return null;
}

// tanggal termasuk periode operasional kalau tanggal >= tanggalMulaiOperasi (atau
// fallbackStart kalau tanggalMulaiOperasi belum diisi) DAN (tanggalTutupOperasi
// null ATAU tanggal <= tanggalTutupOperasi). Kedua batas inklusif.
export function isBranchOperationalOnDate(
  branch: BranchOperationalMeta,
  date: Date,
  fallbackStart: Date | null = null
): boolean {
  const d = toUtcMidnight(date).getTime();
  const start = effectiveStart(branch, fallbackStart);
  if (start !== null && d < start.getTime()) return false;
  if (branch.tanggalTutupOperasi && d > toUtcMidnight(branch.tanggalTutupOperasi).getTime()) return false;
  return true;
}

// Irisan [rangeStart, rangeEndExclusive) dengan periode operasional cabang.
// rangeEndExclusive mengikuti konvensi aplikasi (endDate = eksklusif, lihat
// fetchTransaksiPeriode). Return null kalau tidak ada irisan sama sekali
// (cabang belum mulai sebelum range berakhir, atau sudah tutup sebelum range mulai).
export function getOperationalRangeIntersection(
  branch: BranchOperationalMeta,
  rangeStart: Date,
  rangeEndExclusive: Date,
  fallbackStart: Date | null = null
): { start: Date; end: Date } | null {
  const start = effectiveStart(branch, fallbackStart);
  const rangeStartMid = toUtcMidnight(rangeStart);
  const effStart = start !== null && start.getTime() > rangeStartMid.getTime() ? start : rangeStartMid;

  let effEndExclusive = toUtcMidnight(rangeEndExclusive);
  if (branch.tanggalTutupOperasi) {
    const tutupExclusive = new Date(toUtcMidnight(branch.tanggalTutupOperasi).getTime() + 86400000);
    if (tutupExclusive.getTime() < effEndExclusive.getTime()) effEndExclusive = tutupExclusive;
  }

  if (effStart.getTime() >= effEndExclusive.getTime()) return null;
  return { start: effStart, end: effEndExclusive };
}

// Dipakai untuk "Total Cabang Aktif" historis (section 12) - cabang dianggap
// operasional selama range kalau ada IRISAN sama sekali, bukan harus penuh sepanjang range.
export function isBranchOperationalDuringRange(
  branch: BranchOperationalMeta,
  rangeStart: Date,
  rangeEndExclusive: Date,
  fallbackStart: Date | null = null
): boolean {
  return getOperationalRangeIntersection(branch, rangeStart, rangeEndExclusive, fallbackStart) !== null;
}

// Jumlah hari operasional (expected report days) dalam irisan range - dipakai
// sebagai denominator Kelengkapan Data & rata-rata Dashboard, BUKAN hari kalender mentah.
export function countOperationalDaysInRange(
  branch: BranchOperationalMeta,
  rangeStart: Date,
  rangeEndExclusive: Date,
  fallbackStart: Date | null = null
): number {
  const r = getOperationalRangeIntersection(branch, rangeStart, rangeEndExclusive, fallbackStart);
  if (!r) return 0;
  return Math.round((r.end.getTime() - r.start.getTime()) / 86400000);
}

// Konfigurasi cabang dianggap belum lengkap kalau status terkini Nonaktif tapi
// tanggalTutupOperasi belum diisi - sistem tidak boleh menebak tanggal tutup
// (section 3.B), jadi ini ditandai sebagai warning untuk dilengkapi manual.
export function isBranchConfigIncomplete(branch: { isActive: boolean; tanggalTutupOperasi: Date | null }): boolean {
  return !branch.isActive && !branch.tanggalTutupOperasi;
}
