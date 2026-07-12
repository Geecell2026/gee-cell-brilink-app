export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function formatRupiahSingkat(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs.toFixed(0)}`;
}

export function formatPersen(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

// Selisih dua rasio persen HARUS disebut "poin persentase", bukan "%" - beda makna
// (21,5% -> 29,8% = naik 8,3 poin persentase, bukan "naik 8,3%").
export function formatPoinPersentase(n: number, decimals = 1): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)} poin persentase`;
}

export function formatTanggalSingkat(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function formatTanggalDaftar(dates: Date[], maxShown: number): string {
  const shown = dates.slice(0, maxShown).map(formatTanggalSingkat);
  const sisa = dates.length - shown.length;
  return sisa > 0 ? `${shown.join(", ")}, dan ${sisa} tanggal lainnya` : shown.join(", ");
}
