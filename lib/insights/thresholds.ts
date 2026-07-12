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

  // Kelengkapan data: minimal berapa cabang bermasalah sebelum digabung jadi
  // satu insight regional (bukan satu insight per cabang) - hindari insight
  // fatigue saat banyak cabang punya masalah yang sama.
  minBranchesForGroupedCompleteness: 2,
  // Cabang tetap dapat insight INDIVIDUAL tambahan (di luar yang gabungan)
  // kalau completeness-nya lebih buruk dari rata-rata kelompok sejauh ini
  // (poin persentase) - representasi "jauh lebih kritis dari cabang lain".
  outlierCompletenessGapPoints: 30,
  maxGroupedNamesShown: 3,

  // Common-mode anomaly: anomali arah sama (lonjakan/penurunan) yang terjadi
  // di banyak cabang dalam jendela waktu berdekatan kemungkinan pola wilayah
  // (akhir bulan/gajian/dst), bukan anomali independen per cabang.
  commonModeWindowDays: 2,
  commonModeMinBranchPercent: 50,
  // Cabang tetap dapat insight anomali INDIVIDUAL tambahan di luar common-mode
  // kalau magnitude-nya jauh di atas rata-rata kelompok (kali lipat dari rata-rata).
  commonModeOutlierMultiplier: 1.5,

  // Engine: batas jumlah insight yang ditampilkan di Dashboard (ringkas) - Ringkasan
  // Owner menampilkan semua hasil tanpa batas ini.
  maxDashboardInsights: 7,

  // Category budget Dashboard - jangan biarkan satu kategori menghabiskan semua
  // slot. Kategori yang tidak disebutkan pakai defaultCategoryBudget.
  dashboardCategoryBudget: {
    anomaly: 2,
    data_completeness: 1,
    cost_ratio: 1,
    branch_performance: 1,
  } as Record<string, number>,
  defaultCategoryBudget: 1,
  // Batas tambahan lintas-kategori khusus severity "positive" - supaya insight
  // baik-baik tidak mendominasi slot Dashboard yang terbatas.
  dashboardPositiveSeverityBudget: 1,
} as const;
