import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatPersen, formatRupiah, formatTanggalSingkat } from "../formatters";
import { isBranchOperationalDuringRange } from "@/lib/calculations/operational-period";
import type { BranchInsightData, InsightContext, InsightResult } from "../types";

export const RULE_ID = "branch-trend-contribution";
export const RULE_VERSION = "1.1.0";

function severityUntukPenurunan(persenAbs: number): InsightResult["severity"] {
  if (persenAbs >= 15) return "critical";
  if (persenAbs >= 8) return "warning";
  return "attention";
}

// Basis like-for-like (section 10.B): hanya cabang yang operasional di KEDUA
// periode (aktif & pembanding) - cabang yang belum mulai atau sudah tutup di
// salah satu periode dikeluarkan, supaya penurunan/pertumbuhan wilayah tidak
// salah diatribusikan ke performa cabang yang sebenarnya sedang tutup/baru buka.
function cabangLikeForLike(context: InsightContext): BranchInsightData[] {
  return context.branches.filter(
    (b) =>
      isBranchOperationalDuringRange(b, context.periodStart, context.periodEnd, b.firstReportDate) &&
      isBranchOperationalDuringRange(b, context.previousPeriodStart, context.previousPeriodEnd, b.firstReportDate)
  );
}

function hitungLikeForLike(context: InsightContext) {
  const branches = cabangLikeForLike(context);
  const currentTotal = branches.reduce((s, b) => s + b.currentPendapatan, 0);
  const previousTotal = branches.reduce((s, b) => s + b.previousPendapatan, 0);
  const delta = currentTotal - previousTotal;
  const persen = previousTotal > 0 ? (delta / previousTotal) * 100 : null;
  return { branches, currentTotal, previousTotal, delta, persen };
}

// Catatan struktural terpisah (section 10) - kalau himpunan cabang operasional
// berubah antara periode pembanding dan periode aktif (cabang tutup/baru buka),
// itu dijelaskan sebagai perubahan STRUKTUR, bukan dicampur dengan narasi
// penurunan/pertumbuhan performa cabang yang tetap beroperasi.
function catatanStruktural(context: InsightContext): string | null {
  const operasionalSekarang = context.branches.filter((b) =>
    isBranchOperationalDuringRange(b, context.periodStart, context.periodEnd, b.firstReportDate)
  );
  const operasionalSebelumnya = context.branches.filter((b) =>
    isBranchOperationalDuringRange(b, context.previousPeriodStart, context.previousPeriodEnd, b.firstReportDate)
  );
  const idSekarang = new Set(operasionalSekarang.map((b) => b.branchId));
  const idSebelumnya = new Set(operasionalSebelumnya.map((b) => b.branchId));
  const tutup = operasionalSebelumnya.filter((b) => !idSekarang.has(b.branchId));
  const baru = operasionalSekarang.filter((b) => !idSebelumnya.has(b.branchId));

  if (tutup.length === 0 && baru.length === 0) return null;

  const kalimat: string[] = [];

  if (operasionalSekarang.length !== operasionalSebelumnya.length) {
    const arah = operasionalSekarang.length < operasionalSebelumnya.length ? "berkurang" : "bertambah";
    const alasan = [
      ...tutup.map((b) =>
        b.tanggalTutupOperasi
          ? `${b.branchName} berhenti beroperasi setelah ${formatTanggalSingkat(b.tanggalTutupOperasi)}`
          : `${b.branchName} berhenti beroperasi`
      ),
      ...baru.map((b) => `${b.branchName} baru mulai beroperasi`),
    ].join(", ");
    kalimat.push(
      `Jumlah cabang operasional ${arah} dari ${operasionalSebelumnya.length} menjadi ${operasionalSekarang.length}${alasan ? ` karena ${alasan}` : ""}.`
    );
  }

  for (const b of baru) {
    kalimat.push(
      `Cabang ${b.branchName} baru mulai beroperasi pada periode berjalan dan tidak dimasukkan dalam perbandingan like-for-like.`
    );
  }

  return kalimat.join(" ");
}

// Cabang penyumbang perubahan wilayah dipilih berdasarkan DELTA NOMINAL absolut
// terbesar (bukan persentase) - sengaja, supaya cabang basis kecil dengan
// persentase ekstrem tidak salah diprioritaskan di atas cabang basis besar
// dengan pergerakan nominal jauh lebih signifikan.
//
// v1.1.0: "Total aktual wilayah" (regionDelta/regionPersen, dari SEMUA cabang -
// section 10.A) TIDAK diubah. Ditambahkan metrik LIKE-FOR-LIKE terpisah (section
// 10.B, hanya cabang operasional di kedua periode) untuk atribusi kontribusi -
// supaya cabang yang tutup/baru buka tidak disalahartikan sebagai penurunan
// atau pertumbuhan performa. Perubahan jumlah cabang operasional dijelaskan
// lewat catatan struktural terpisah, tidak dicampur ke narasi performa.
export function generateBranchTrendContributionInsights(context: InsightContext): InsightResult[] {
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);

  const currentTotal = context.branches.reduce((s, b) => s + b.currentPendapatan, 0);
  const previousTotal = context.branches.reduce((s, b) => s + b.previousPendapatan, 0);

  // Tanpa baseline pembanding yang valid, persentase perubahan tidak bermakna -
  // suppress daripada menampilkan "turun 100%" yang menyesatkan.
  if (previousTotal <= 0) return [];

  const regionDelta = currentTotal - previousTotal;
  const regionPersen = (regionDelta / previousTotal) * 100;
  if (Math.abs(regionPersen) < INSIGHT_THRESHOLDS.minRegionChangePercentForTrendInsight) return [];

  const deltas = context.branches
    .map((b) => ({ branch: b, delta: b.currentPendapatan - b.previousPendapatan }))
    .filter((d) => d.delta !== 0);
  if (deltas.length === 0) return [];

  const lfl = hitungLikeForLike(context);
  const lflIds = new Set(lfl.branches.map((b) => b.branchId));
  const strukturalNote = catatanStruktural(context);

  if (regionDelta < 0) {
    const negatives = deltas.filter((d) => d.delta < 0);
    if (negatives.length === 0) return [];
    const severity = severityUntukPenurunan(Math.abs(regionPersen));

    let message = `Pendapatan Wilayah Ekek turun ${formatPersen(Math.abs(regionPersen))} dibanding ${context.comparisonLabel}.`;
    if (lfl.persen !== null) {
      message += ` Pada basis cabang yang aktif di kedua periode, penurunan like-for-like sebesar ${formatPersen(Math.abs(lfl.persen))}.`;
    }

    const negativesLikeForLike = negatives.filter((d) => lflIds.has(d.branch.branchId));
    let entityId: string | undefined;
    let entityName = "Wilayah Ekek";
    let action = "Tinjau perubahan struktur cabang (cabang baru/tutup) yang memengaruhi total wilayah.";

    if (negativesLikeForLike.length > 0) {
      const sumAbsNegatifLfl = negativesLikeForLike.reduce((s, d) => s + Math.abs(d.delta), 0);
      const top = [...negativesLikeForLike].sort((a, b) => a.delta - b.delta)[0];
      const kontribusiPersen = sumAbsNegatifLfl > 0 ? (Math.abs(top.delta) / sumAbsNegatifLfl) * 100 : 0;
      message += ` Penurunan terbesar berasal dari Cabang ${top.branch.branchName}, turun ${formatRupiah(Math.abs(top.delta))} atau menyumbang ${formatPersen(kontribusiPersen)} dari total penurunan like-for-like.`;
      entityId = top.branch.branchId;
      entityName = top.branch.branchName;
      action = `Prioritaskan evaluasi transaksi dan pendapatan Cabang ${top.branch.branchName}.`;
    } else {
      message += ` Penurunan ini didominasi oleh perubahan struktur cabang (buka/tutup), bukan performa cabang yang tetap beroperasi di kedua periode.`;
    }
    if (strukturalNote) message += ` ${strukturalNote}`;

    return [
      {
        id: `${RULE_ID}:region:${periodStart}:${periodEnd}`,
        ruleId: RULE_ID,
        ruleVersion: RULE_VERSION,
        category: "branch_performance",
        severity,
        priorityScore: computePriorityScore({ severity, absoluteRupiahImpact: regionDelta }),
        title: `Pendapatan Wilayah Ekek turun ${formatPersen(Math.abs(regionPersen))}`,
        message,
        action,
        entityType: entityId ? "branch" : "region",
        entityId,
        entityName,
        metricValue: regionDelta,
        comparisonValue: previousTotal,
        periodStart,
        periodEnd,
        sourceModules: ["Transaksi Harian", "Mingguan & Bulanan"],
        href: "/analisis/mingguan-bulanan",
        generatedAt: context.generatedAt,
      },
    ];
  }

  const positives = deltas.filter((d) => d.delta > 0);
  if (positives.length === 0) return [];

  const positivesLikeForLike = positives.filter((d) => lflIds.has(d.branch.branchId));
  let message: string;
  let entityId: string;
  let entityName: string;

  if (positivesLikeForLike.length > 0) {
    const top = [...positivesLikeForLike].sort((a, b) => b.delta - a.delta)[0];
    message = `Pertumbuhan pendapatan Wilayah Ekek terutama didorong Cabang ${top.branch.branchName}, naik ${formatRupiah(top.delta)} dibanding ${context.comparisonLabel} (basis cabang yang aktif di kedua periode).`;
    entityId = top.branch.branchId;
    entityName = top.branch.branchName;
  } else {
    const top = [...positives].sort((a, b) => b.delta - a.delta)[0];
    message = `Pertumbuhan pendapatan Wilayah Ekek terutama didorong Cabang ${top.branch.branchName}, naik ${formatRupiah(top.delta)} dibanding ${context.comparisonLabel}. Kontribusi ini melibatkan cabang yang belum operasional penuh di kedua periode, bukan murni pertumbuhan cabang yang sama sejak awal.`;
    entityId = top.branch.branchId;
    entityName = top.branch.branchName;
  }
  if (strukturalNote) message += ` ${strukturalNote}`;

  return [
    {
      id: `${RULE_ID}:region:${periodStart}:${periodEnd}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "branch_performance",
      severity: "positive",
      priorityScore: computePriorityScore({ severity: "positive", absoluteRupiahImpact: regionDelta }),
      title: `Pendapatan Wilayah Ekek tumbuh ${formatPersen(regionPersen)}`,
      message,
      action: "Tinjau strategi Cabang " + entityName + " untuk direplikasi ke cabang lain.",
      entityType: "branch",
      entityId,
      entityName,
      metricValue: regionDelta,
      comparisonValue: previousTotal,
      periodStart,
      periodEnd,
      sourceModules: ["Transaksi Harian", "Mingguan & Bulanan"],
      href: "/analisis/mingguan-bulanan",
      generatedAt: context.generatedAt,
    },
  ];
}
