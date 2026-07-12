import type { InsightSeverity } from "./types";

// Urutan severity dari paling mendesak ke paling ringan - dipakai engine untuk
// sorting utama sebelum priorityScore jadi tie-breaker dalam severity yang sama.
export const SEVERITY_ORDER: InsightSeverity[] = ["critical", "warning", "attention", "positive", "info"];

const SEVERITY_WEIGHT: Record<InsightSeverity, number> = {
  critical: 100,
  warning: 70,
  attention: 40,
  positive: 10,
  info: 5,
};

// Dampak finansial dibobotkan bertingkat (bukan linear terhadap Rupiah) supaya
// satu insight bernilai sangat besar tidak otomatis mendominasi seluruh urutan.
function financialImpactWeight(absoluteRupiah: number | null | undefined): number {
  if (!absoluteRupiah || !Number.isFinite(absoluteRupiah)) return 0;
  const abs = Math.abs(absoluteRupiah);
  if (abs >= 10_000_000) return 30;
  if (abs >= 5_000_000) return 20;
  if (abs >= 1_000_000) return 10;
  if (abs >= 200_000) return 5;
  return 0;
}

// Berapa kali kejadian ini terulang (mis. jumlah hari 0 transaksi, jumlah hari
// laporan hilang) - dibatasi supaya tidak mendominasi severityWeight.
function recurrenceWeight(occurrences: number | undefined): number {
  if (!occurrences || occurrences <= 1) return 0;
  return Math.min(occurrences * 5, 20);
}

// Bonus kecil untuk insight yang datanya cukup (bukan dari sampel sangat kecil)
// - selaras dengan larangan spec: jangan prioritaskan basis data yang terlalu kecil.
function confidenceWeight(sampleSize: number | undefined): number {
  if (!sampleSize) return 0;
  if (sampleSize >= 14) return 10;
  if (sampleSize >= 7) return 5;
  return 0;
}

export function computePriorityScore(params: {
  severity: InsightSeverity;
  absoluteRupiahImpact?: number | null;
  occurrences?: number;
  sampleSize?: number;
}): number {
  return (
    SEVERITY_WEIGHT[params.severity] +
    financialImpactWeight(params.absoluteRupiahImpact) +
    recurrenceWeight(params.occurrences) +
    confidenceWeight(params.sampleSize)
  );
}
