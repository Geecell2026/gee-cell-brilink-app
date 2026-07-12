// Konfigurasi terpusat - jangan sebar magic number di masing-masing rule.
export const INSIGHT_THRESHOLDS = {
  // Rule anomali: berapa kali "0 transaksi" (hari yang SUDAH dilaporkan, bukan
  // belum diinput) dalam periode aktif sebelum dianggap critical/warning.
  repeatedZeroTransactionDaysCritical: 3,
  repeatedZeroTransactionDaysWarning: 2,

  // Rule kontribusi tren: perubahan wilayah minimal (dalam persen, nilai absolut)
  // sebelum insight ditampilkan - hindari noise pada fluktuasi kecil sehari-hari.
  minRegionChangePercentForTrendInsight: 3,

  // Rule Cost Ratio: selisih poin persentase minimal sebelum insight ditampilkan,
  // dan ambang "Cost Ratio tinggi" yang berdiri sendiri (walau tidak berubah banyak).
  costRatioChangePoints: 5,
  highCostRatio: 30,

  // Rule kelengkapan data: cabang dianggap "bermasalah kelengkapan" kalau minimal
  // sekian hari yang seharusnya ada laporan tapi belum diinput.
  minMissingDaysForInsight: 2,
  maxMissingDatesShown: 4,

  // Engine: batas jumlah insight yang ditampilkan di Dashboard (ringkas) - Ringkasan
  // Owner menampilkan semua hasil tanpa batas ini.
  maxDashboardInsights: 7,
} as const;
