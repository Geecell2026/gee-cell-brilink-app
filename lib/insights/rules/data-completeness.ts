import { computePriorityScore } from "../severity";
import { SEVERITY_ORDER } from "../severity";
import { INSIGHT_THRESHOLDS } from "../thresholds";
import { formatTanggalDaftar } from "../formatters";
import { getOperationalRangeIntersection } from "@/lib/calculations/operational-period";
import type { InsightContext, InsightGroupMember, InsightResult, InsightSeverity } from "../types";

export const RULE_ID = "data-completeness";
export const RULE_VERSION = "1.2.0";

function tambahHari(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

function severityDariCompleteness(completeness: number): InsightSeverity {
  if (completeness < 50) return "critical";
  if (completeness < 80) return "warning";
  return "attention";
}

type Kandidat = {
  branchId: string;
  branchName: string;
  expectedDays: number;
  missingDays: number;
  completeness: number;
  missingDates: Date[];
  severity: InsightSeverity;
};

// Kelengkapan dihitung per cabang, diklem ke IRISAN periode filter dengan
// periode operasional cabang (tanggalMulaiOperasi..tanggalTutupOperasi, fallback
// firstReportDate kalau tanggalMulaiOperasi belum diisi) DAN dibatasi "jangan
// hitung hari mendatang" - lihat lib/calculations/operational-period.ts.
// Efeknya: hari sebelum cabang mulai, hari setelah cabang tutup permanen, dan
// hari mendatang semua otomatis TIDAK masuk ExpectedReportDays maupun
// MissingDays (section 8 spec periode operasional).
//
// Branch tanpa firstReportDate DAN tanpa tanggalMulaiOperasi (belum pernah
// lapor sekalipun, belum dikonfigurasi) sengaja dilewati - tidak ada dasar
// untuk menentukan kapan seharusnya cabang itu mulai lapor.
//
// Cabang yang statusnya Nonaktif SEKARANG tetap bisa jadi kandidat di sini
// kalau periode filter beririsan dengan periode operasional historisnya
// (sebelum tanggalTutupOperasi) - status terkini tidak menghapus histori.
//
// v1.1.0: kalau >=2 cabang sama-sama bermasalah, digabung jadi SATU insight
// regional (hindari insight fatigue) - cabang yang jauh lebih kritis dari
// rata-rata kelompok tetap dapat insight individual TAMBAHAN di luar itu.
// v1.2.0: ExpectedReportDays diklem ke periode operasional cabang (bukan cuma
// firstReportDate..besok) - lihat lib/calculations/operational-period.ts.
export function generateDataCompletenessInsights(context: InsightContext): InsightResult[] {
  const periodStart = context.periodStart.toISOString().slice(0, 10);
  const periodEnd = context.periodEnd.toISOString().slice(0, 10);
  const besok = tambahHari(
    new Date(Date.UTC(context.today.getUTCFullYear(), context.today.getUTCMonth(), context.today.getUTCDate())),
    1
  );
  const batasAtasPeriode = context.periodEnd < besok ? context.periodEnd : besok;

  const kandidat: Kandidat[] = [];
  // Cabang yang punya IRISAN periode operasional di periode ini (dievaluasi
  // sama sekali), dipakai sebagai penyebut "X dari Y cabang" pada pesan grup -
  // BUKAN context.branches.length yang juga menghitung cabang yang sudah tutup/
  // belum mulai di periode ini (mis. AB2 setelah 17 Maret 2026).
  let totalCabangOperasional = 0;
  for (const branch of context.branches) {
    if (!branch.firstReportDate && !branch.tanggalMulaiOperasi) continue;

    const irisan = getOperationalRangeIntersection(
      branch,
      context.periodStart,
      batasAtasPeriode,
      branch.firstReportDate
    );
    if (!irisan) continue;
    totalCabangOperasional++;
    const { start: expectedStart, end: expectedEnd } = irisan;

    const expectedDays = Math.round((expectedEnd.getTime() - expectedStart.getTime()) / 86400000);
    const reportedDates = new Set(
      branch.currentPoints
        .filter((p) => p.date.getTime() >= expectedStart.getTime() && p.date.getTime() < expectedEnd.getTime())
        .map((p) => p.date.toISOString().slice(0, 10))
    );
    const submittedDays = reportedDates.size;
    const missingDays = expectedDays - submittedDays;
    if (missingDays < INSIGHT_THRESHOLDS.minMissingDaysForInsight) continue;

    const completeness = expectedDays > 0 ? (submittedDays / expectedDays) * 100 : 0;
    const missingDates: Date[] = [];
    for (let d = expectedStart; d.getTime() < expectedEnd.getTime(); d = tambahHari(d, 1)) {
      if (!reportedDates.has(d.toISOString().slice(0, 10))) missingDates.push(d);
    }

    kandidat.push({
      branchId: branch.branchId,
      branchName: branch.branchName,
      expectedDays,
      missingDays,
      completeness,
      missingDates,
      severity: severityDariCompleteness(completeness),
    });
  }

  if (kandidat.length === 0) return [];

  function buatIndividual(k: Kandidat): InsightResult {
    const tanggalList = formatTanggalDaftar(k.missingDates, INSIGHT_THRESHOLDS.maxMissingDatesShown);
    return {
      id: `${RULE_ID}:${k.branchId}:${periodStart}:${periodEnd}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      category: "data_completeness",
      severity: k.severity,
      priorityScore: computePriorityScore({ severity: k.severity, occurrences: k.missingDays, sampleSize: k.expectedDays }),
      title: `Kelengkapan laporan ${k.branchName} ${k.completeness < 50 ? "rendah" : "belum lengkap"}`,
      message: `Cabang ${k.branchName} belum menginput ${k.missingDays} dari ${k.expectedDays} hari periode ${context.periodLabel} (${tanggalList}).`,
      action: "Lengkapi laporan tanggal yang masih kosong dan konfirmasi ke penanggung jawab cabang.",
      entityType: "branch",
      entityId: k.branchId,
      entityName: k.branchName,
      metricValue: k.missingDays,
      comparisonValue: k.expectedDays,
      periodStart,
      periodEnd,
      sourceModules: ["Data & Validasi", "Transaksi Harian"],
      href: "/analisis/data",
      generatedAt: context.generatedAt,
    };
  }

  // Kurang dari ambang minimum untuk digabung -> semua tetap insight individual.
  if (kandidat.length < INSIGHT_THRESHOLDS.minBranchesForGroupedCompleteness) {
    return kandidat.map(buatIndividual);
  }

  // Digabung jadi satu insight regional. Severity grup = severity TERBURUK di
  // antara anggotanya (kalau ada 1 saja yang critical, grup ikut critical -
  // ini yang membuat "kelengkapan hilang di sebagian besar cabang tetap bisa
  // critical", bukan otomatis diredam jadi ringan karena jumlahnya banyak).
  const severityTerburuk = [...kandidat].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )[0].severity;

  const rataRataCompleteness = kandidat.reduce((s, k) => s + k.completeness, 0) / kandidat.length;
  const totalMissingDays = kandidat.reduce((s, k) => s + k.missingDays, 0);
  const totalExpectedDays = kandidat.reduce((s, k) => s + k.expectedDays, 0);

  const namaUrut = [...kandidat].sort((a, b) => a.completeness - b.completeness).map((k) => k.branchName);
  const namaTampil = namaUrut.slice(0, INSIGHT_THRESHOLDS.maxGroupedNamesShown);
  const sisaNama = namaUrut.length - namaTampil.length;
  const daftarCabang =
    sisaNama > 0 ? `${namaTampil.join(", ")}, dan ${sisaNama} cabang lainnya` : namaTampil.join(", ");

  const groupMembers: InsightGroupMember[] = [...kandidat]
    .sort((a, b) => a.completeness - b.completeness)
    .map((k) => ({ entityId: k.branchId, entityName: k.branchName, metricValue: k.missingDays }));

  const sortedIds = kandidat.map((k) => k.branchId).sort();
  const grouped: InsightResult = {
    id: `${RULE_ID}:region-group:${periodStart}:${periodEnd}:${sortedIds.join(",")}`,
    ruleId: RULE_ID,
    ruleVersion: RULE_VERSION,
    category: "data_completeness",
    severity: severityTerburuk,
    priorityScore: computePriorityScore({
      severity: severityTerburuk,
      occurrences: kandidat.length,
      sampleSize: totalExpectedDays,
    }),
    title: "Pelaporan wilayah belum lengkap",
    message: `${kandidat.length} dari ${totalCabangOperasional} cabang yang operasional pada periode ini belum menginput laporan lengkap pada periode ${context.periodLabel}: ${daftarCabang}.`,
    action: "Hubungi penanggung jawab cabang dan lengkapi laporan yang belum diinput.",
    entityType: "region",
    entityName: "Wilayah Ekek",
    metricValue: totalMissingDays,
    comparisonValue: totalExpectedDays,
    periodStart,
    periodEnd,
    sourceModules: ["Data & Validasi", "Transaksi Harian"],
    href: "/analisis/data",
    generatedAt: context.generatedAt,
    groupMembers,
  };

  // Cabang yang jauh lebih kritis dari rata-rata kelompok (bukan cuma ikut-ikutan
  // rendah) tetap dapat insight individual TAMBAHAN - grup tidak menyembunyikan
  // masalah yang jauh lebih parah dari yang lain.
  const outlierIndividual = kandidat
    .filter((k) => rataRataCompleteness - k.completeness >= INSIGHT_THRESHOLDS.outlierCompletenessGapPoints)
    .map(buatIndividual);

  return [grouped, ...outlierIndividual];
}
