import { deteksiAnomali } from "@/lib/analytics/anomaly";
import { rataRata } from "@/lib/analytics/statistics";
import { computePriorityScore } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatTanggalDaftar, formatTanggalSingkat } from "../formatters";
import type { Anomali } from "@/types/analytics";
import type { InsightContext, InsightGroupMember, InsightResult } from "../types";

export const RULE_ID = "branch-anomaly";
export const RULE_VERSION = "1.2.0";

type ArahAnomali = "naik" | "turun";
type PeristiwaAnomali = Anomali & { branchId: string; branchName: string; arah: ArahAnomali };

function arahDari(jenis: string): ArahAnomali {
  return jenis.startsWith("Sangat Rendah") || jenis.startsWith("Penurunan") ? "turun" : "naik";
}

// Kelompokkan peristiwa (sudah terurut tanggal) jadi cluster - anggota cluster
// yang sama kalau jarak ke tetangga sebelumnya <= windowDays (chain clustering,
// bukan jarak ke titik pertama cluster, supaya rentang 25-29 Juni tetap 1
// cluster walau jarak ujung-ke-ujungnya 4 hari > window 2 hari).
function kelompokkanPerTanggal(peristiwa: PeristiwaAnomali[], windowDays: number): PeristiwaAnomali[][] {
  const urut = [...peristiwa].sort((a, b) => a.date.getTime() - b.date.getTime());
  const clusters: PeristiwaAnomali[][] = [];
  let current: PeristiwaAnomali[] = [];
  for (const p of urut) {
    if (current.length === 0) {
      current.push(p);
      continue;
    }
    const gapHari = (p.date.getTime() - current[current.length - 1].date.getTime()) / 86400000;
    if (gapHari <= windowDays) current.push(p);
    else {
      clusters.push(current);
      current = [p];
    }
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function rentangTanggal(peristiwa: PeristiwaAnomali[]): string {
  const tanggal = peristiwa.map((p) => p.date).sort((a, b) => a.getTime() - b.getTime());
  const awal = tanggal[0];
  const akhir = tanggal[tanggal.length - 1];
  return awal.getTime() === akhir.getTime()
    ? formatTanggalSingkat(awal)
    : `${formatTanggalSingkat(awal)}-${formatTanggalSingkat(akhir)}`;
}

// Sengaja TIDAK membuat rumus anomali sendiri - deteksiAnomali (dipakai juga di
// halaman Analisis Harian) sudah menghitung ini dengan benar (z-score >2SD +
// perubahan harian drastis). currentPoints di sini HANYA berisi hari yang
// SUDAH ada baris DailyTransaction (laporan belum masuk = beda rule, lihat
// data-completeness.ts) - jadi "0 transaksi" di sini selalu berarti hari itu
// benar-benar dilaporkan dengan nilai 0, bukan laporan yang hilang.
//
// v1.1.0: anomali lonjakan/penurunan yang terjadi SERENTAK di banyak cabang
// dalam jendela waktu berdekatan digabung jadi satu insight wilayah (bukan
// dianggap anomali independen tiap cabang) - lihat kelompokkanCommonMode().
// Bagian "0 transaksi berulang" TIDAK diubah sama sekali dari v1.0.0.
//
// v1.2.0: TIDAK ADA perubahan logic di file ini - rule ini otomatis ikut
// terkoreksi lewat context.ts, yang sekarang mengklem branch.currentPoints ke
// periode operasional cabang (tanggalMulaiOperasi..tanggalTutupOperasi) sebelum
// sampai ke sini (lihat lib/calculations/operational-period.ts). Jadi hari
// sebelum cabang mulai/setelah cabang tutup permanen tidak akan pernah muncul
// di currentPoints, otomatis tidak pernah dievaluasi sebagai anomali - tanpa
// rule ini perlu tahu apa itu "periode operasional".
export function generateBranchAnomalyInsights(context: InsightContext): InsightResult[] {
  const results: InsightResult[] = [];
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);

  // --- Bagian 1: 0 transaksi berulang (tidak diubah dari v1.0.0) ---
  for (const branch of context.branches) {
    if (branch.currentPoints.length === 0) continue;

    const zeroDays = branch.currentPoints.filter((p) => p.totalTransaksi === 0);
    const nonZeroAvg = rataRata(branch.currentPoints.filter((p) => p.totalTransaksi > 0).map((p) => p.totalTransaksi));

    if (zeroDays.length > 0) {
      let severity: InsightResult["severity"] | null = null;
      if (zeroDays.length >= INSIGHT_THRESHOLDS.repeatedZeroTransactionDaysCritical) severity = "critical";
      else if (zeroDays.length >= INSIGHT_THRESHOLDS.repeatedZeroTransactionDaysWarning) severity = "warning";
      else if (zeroDays.length === 1 && nonZeroAvg > 3) severity = "attention";

      if (severity) {
        const tanggalList = formatTanggalDaftar(
          zeroDays.map((p) => p.date),
          INSIGHT_THRESHOLDS.maxMissingDatesShown
        );
        results.push({
          id: `${RULE_ID}:${branch.branchId}:${periodStart}:${periodEnd}:zero`,
          ruleId: RULE_ID,
          ruleVersion: RULE_VERSION,
          category: "anomaly",
          severity,
          priorityScore: computePriorityScore({
            severity,
            occurrences: zeroDays.length,
            sampleSize: branch.currentPoints.length,
          }),
          title: `Cabang ${branch.branchName} tercatat 0 transaksi berulang`,
          message: `Cabang ${branch.branchName} tercatat 0 transaksi pada ${zeroDays.length} dari ${branch.currentPoints.length} hari laporan pada periode ${context.periodLabel} (${tanggalList}).`,
          action: "Periksa laporan tanggal terkait dan konfirmasi kepada penanggung jawab cabang.",
          entityType: "branch",
          entityId: branch.branchId,
          entityName: branch.branchName,
          metricValue: zeroDays.length,
          comparisonValue: branch.currentPoints.length,
          periodStart,
          periodEnd,
          sourceModules: ["Transaksi Harian", "Deteksi Anomali"],
          href: "/analisis/harian",
          generatedAt: context.generatedAt,
        });
      }
    }
  }

  // --- Bagian 2: lonjakan/penurunan drastis - common-mode dulu, sisanya individual ---
  const aktifCount = context.branches.length;
  const semuaPeristiwa: PeristiwaAnomali[] = [];
  for (const branch of context.branches) {
    if (branch.currentPoints.length === 0) continue;
    const anomaliLain = deteksiAnomali(branch.currentPoints).filter((a) => a.totalTransaksi !== 0);
    for (const a of anomaliLain) {
      semuaPeristiwa.push({ ...a, branchId: branch.branchId, branchName: branch.branchName, arah: arahDari(a.jenis) });
    }
  }

  // branchId yang peristiwanya sudah "diwakili" oleh insight common-mode -
  // tidak dapat insight individual lagi kecuali dia outlier di cluster itu.
  const terserapCommonMode = new Set<string>();

  for (const arah of ["naik", "turun"] as const) {
    const pool = semuaPeristiwa.filter((p) => p.arah === arah);
    if (pool.length === 0) continue;

    for (const cluster of kelompokkanPerTanggal(pool, INSIGHT_THRESHOLDS.commonModeWindowDays)) {
      const branchIdsUnik = Array.from(new Set(cluster.map((p) => p.branchId)));
      const persenCabang = aktifCount > 0 ? (branchIdsUnik.length / aktifCount) * 100 : 0;
      if (branchIdsUnik.length < 2 || persenCabang < INSIGHT_THRESHOLDS.commonModeMinBranchPercent) continue;

      // Representasi 1 nilai magnitude per cabang dalam cluster ini (yang paling
      // ekstrem kalau cabang itu punya >1 peristiwa dalam cluster yang sama).
      const magnitudePerBranch = new Map<string, number>();
      for (const p of cluster) {
        const nilai = p.totalTransaksi ?? 0;
        const current = magnitudePerBranch.get(p.branchId);
        if (current === undefined) magnitudePerBranch.set(p.branchId, nilai);
        else if (arah === "naik") magnitudePerBranch.set(p.branchId, Math.max(current, nilai));
        else magnitudePerBranch.set(p.branchId, Math.min(current, nilai));
      }
      const rataMagnitude = rataRata(Array.from(magnitudePerBranch.values()));

      for (const id of branchIdsUnik) terserapCommonMode.add(id);

      const outlierIds = branchIdsUnik.filter((id) => {
        const m = magnitudePerBranch.get(id)!;
        return arah === "naik"
          ? m >= rataMagnitude * INSIGHT_THRESHOLDS.commonModeOutlierMultiplier
          : m <= rataMagnitude / INSIGHT_THRESHOLDS.commonModeOutlierMultiplier;
      });
      // Outlier tetap dapat insight individual TAMBAHAN - keluarkan dari daftar terserap.
      for (const id of outlierIds) terserapCommonMode.delete(id);

      // Konteks musiman lemah: kalau mayoritas tanggal cluster ada di posisi akhir
      // bulan (data yang SAMA, bukan klaim historis), sebut kemungkinan itu secara
      // eksplisit sebagai dugaan - bukan klaim pasti karena histori multi-bulan
      // belum tersedia di context ini.
      const akhirBulanCount = cluster.filter((p) => {
        const point = context.branches
          .find((b) => b.branchId === p.branchId)
          ?.currentPoints.find((pt) => pt.date.getTime() === p.date.getTime());
        return point?.posisiBulan === "AKHIR";
      }).length;
      const kemungkinanPenyebab =
        akhirBulanCount / cluster.length >= 0.5
          ? "periode akhir bulan"
          : "pola bersama wilayah (perlu dibandingkan dengan periode sebelumnya)";

      const rentang = rentangTanggal(cluster);
      const groupMembers: InsightGroupMember[] = branchIdsUnik
        .map((id) => ({
          entityId: id,
          entityName: cluster.find((p) => p.branchId === id)!.branchName,
          metricValue: magnitudePerBranch.get(id) ?? null,
        }))
        .sort((a, b) => (b.metricValue ?? 0) - (a.metricValue ?? 0));

      const severity: InsightResult["severity"] = arah === "naik" ? "info" : "warning";
      const kataArah = arah === "naik" ? "lonjakan" : "penurunan";
      const sortedIds = [...branchIdsUnik].sort();

      results.push({
        id: `${RULE_ID}:common-mode-${arah}:${periodStart}:${periodEnd}:${rentang}:${sortedIds.join(",")}`,
        ruleId: RULE_ID,
        ruleVersion: RULE_VERSION,
        category: "anomaly",
        severity,
        priorityScore: computePriorityScore({ severity, occurrences: branchIdsUnik.length, sampleSize: aktifCount }),
        title: `${branchIdsUnik.length} cabang mengalami ${kataArah} transaksi serentak`,
        message: `${branchIdsUnik.length} dari ${aktifCount} cabang mengalami ${kataArah} transaksi secara serentak pada ${rentang}. Pola ini kemungkinan terkait ${kemungkinanPenyebab}, bukan anomali individual per cabang.`,
        action:
          arah === "naik"
            ? "Bandingkan pola dengan akhir bulan sebelumnya sebelum melakukan evaluasi cabang individual."
            : "Bandingkan pola dengan periode sebelumnya dan periksa apakah ada faktor operasional bersama (mis. gangguan sistem).",
        entityType: "region",
        entityName: "Wilayah Ekek",
        metricValue: branchIdsUnik.length,
        comparisonValue: aktifCount,
        periodStart,
        periodEnd,
        sourceModules: ["Transaksi Harian", "Deteksi Anomali"],
        href: "/analisis/harian",
        generatedAt: context.generatedAt,
        groupMembers,
      });
    }
  }

  // Insight individual: peristiwa yang TIDAK terserap common-mode (termasuk
  // outlier yang sengaja dikeluarkan di atas) - hanya kejadian PALING BARU per
  // cabang, sama seperti v1.0.0.
  const branchIdsSudahDiproses = new Set<string>();
  const peristiwaTerurutBaru = [...semuaPeristiwa].sort((a, b) => b.date.getTime() - a.date.getTime());
  for (const p of peristiwaTerurutBaru) {
    if (terserapCommonMode.has(p.branchId)) continue;
    if (branchIdsSudahDiproses.has(p.branchId)) continue;
    branchIdsSudahDiproses.add(p.branchId);

    const turun = p.arah === "turun";
    const severity: InsightResult["severity"] = turun ? "warning" : "positive";
    const tanggal = p.date.toISOString().slice(0, 10);

    results.push({
      id: `${RULE_ID}:${p.branchId}:${periodStart}:${periodEnd}:${tanggal}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "anomaly",
      severity,
      priorityScore: computePriorityScore({ severity, sampleSize: context.branches.length }),
      title: turun
        ? `Cabang ${p.branchName} mengalami penurunan transaksi tidak biasa`
        : `Cabang ${p.branchName} mencatat lonjakan transaksi`,
      message: `Cabang ${p.branchName} tercatat ${p.totalTransaksi} transaksi pada ${p.date.toLocaleDateString("id-ID", { timeZone: "UTC" })} (${p.jenis}). Kemungkinan penyebab: ${p.kemungkinanPenyebab.join(", ")}.`,
      action: turun
        ? "Periksa laporan harian dan konfirmasi kondisi operasional cabang."
        : "Tinjau penyebab lonjakan untuk direplikasi di cabang lain.",
      entityType: "branch",
      entityId: p.branchId,
      entityName: p.branchName,
      metricValue: p.totalTransaksi,
      comparisonValue: null,
      periodStart,
      periodEnd,
      sourceModules: ["Transaksi Harian", "Deteksi Anomali"],
      href: "/analisis/harian",
      generatedAt: context.generatedAt,
    });
  }

  return results;
}
