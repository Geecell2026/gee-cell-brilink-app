import { db } from "@/lib/db";
import { hitungTotalPendapatan, hitungTotalPengeluaran } from "@/lib/calculations/transaksi";
import { hitungStockLevels } from "@/lib/calculations/stock";
import { getAppSettings } from "@/lib/calculations/settings";
import { pertumbuhanPersen, rataRata } from "@/lib/analytics/statistics";
import { hitungProyeksiAkhirBulan } from "@/lib/forecast/forecast";
import type {
  DashboardKpi,
  DetailCabangDashboard,
  Growth,
  KomposisiTransaksi,
  PeriodeMode,
  ProyeksiSkenario,
  StatusCabangDashboard,
  TransaksiPerJenisRow,
  TrendPoint,
} from "@/types/dashboard";

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtTanggalPendek(d: Date): string {
  return `${d.getUTCDate()} ${BULAN_SINGKAT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Default periode Dashboard = bulan berjalan (1 s/d hari ini) - supaya
// "Periode yang sama bulan lalu" langsung punya arti (band 1-9 Juli vs 1-9 Juni).
export function resolveDashboardPeriod(params: { startDate?: string; endDate?: string }) {
  if (!params.startDate && !params.endDate) {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return {
      startDate,
      endDate,
      startDateStr: startDate.toISOString().slice(0, 10),
      endDateStr: new Date(endDate.getTime() - 86400000).toISOString().slice(0, 10),
    };
  }
  const startDate = params.startDate ? new Date(`${params.startDate}T00:00:00Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const endDateInclusive = params.endDate ? new Date(`${params.endDate}T00:00:00Z`) : new Date();
  const endDate = new Date(endDateInclusive.getTime() + 86400000);
  return {
    startDate,
    endDate,
    startDateStr: startDate.toISOString().slice(0, 10),
    endDateStr: endDateInclusive.toISOString().slice(0, 10),
  };
}

function periodeLengthDays(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

// Perbandingan periode yang adil (bukan bulan-berjalan-parsial vs bulan-lalu-
// penuh). 3 mode pembanding.
function resolveComparablePeriod(startDate: Date, endDate: Date, mode: PeriodeMode) {
  const lastDayIncluded = new Date(endDate.getTime() - 86400000);

  if (mode === "BULAN_PENUH_SEBELUMNYA") {
    const prevMonthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    return {
      prevStart: prevMonthStart,
      prevEnd: prevMonthEnd,
      pembandingLabel: `Bulan penuh sebelumnya (${BULAN_PANJANG[prevMonthStart.getUTCMonth()]} ${prevMonthStart.getUTCFullYear()})`,
      scaleToPeriodLength: false,
    };
  }

  if (mode === "RATA_HARIAN_BULAN_LALU") {
    const prevMonthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    return {
      prevStart: prevMonthStart,
      prevEnd: prevMonthEnd,
      pembandingLabel: `Rata-rata harian bulan lalu (${BULAN_PANJANG[prevMonthStart.getUTCMonth()]} ${prevMonthStart.getUTCFullYear()}) x ${periodeLengthDays(startDate, endDate)} hari`,
      scaleToPeriodLength: true,
    };
  }

  // Default: SAMA_BULAN_LALU - geser mundur 1 bulan pada tanggal awal & akhir yang sama.
  const prevStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 1, startDate.getUTCDate()));
  const prevEndInclusive = new Date(Date.UTC(lastDayIncluded.getUTCFullYear(), lastDayIncluded.getUTCMonth() - 1, lastDayIncluded.getUTCDate()));
  const prevEnd = new Date(prevEndInclusive.getTime() + 86400000);
  return {
    prevStart,
    prevEnd,
    pembandingLabel: `${fmtTanggalPendek(prevStart)} - ${fmtTanggalPendek(prevEndInclusive)}`,
    scaleToPeriodLength: false,
  };
}

type TxRow = Awaited<ReturnType<typeof fetchTransaksiPeriode>>[number];

async function fetchTransaksiPeriode(branchId: string | undefined, startDate: Date, endDate: Date) {
  return db.dailyTransaction.findMany({
    where: { ...(branchId ? { branchId } : {}), date: { gte: startDate, lt: endDate } },
    include: { branch: true, tellerBreakdown: true },
    orderBy: { date: "asc" },
  });
}

// Total Pendapatan/Pengeluaran pakai persis hitungTotalPendapatan/
// hitungTotalPengeluaran dari lib/calculations/transaksi.ts (satu sumber
// kebenaran yang sama dengan Saldo Akhir) - TIDAK diubah/diduplikasi di sini.
export function hitungPendapatanBiayaLaba(transaksi: TxRow[]) {
  let pendapatan = 0;
  let biaya = 0;
  for (const tx of transaksi) {
    pendapatan += hitungTotalPendapatan(tx);
    biaya += hitungTotalPengeluaran(tx);
  }
  const laba = pendapatan - biaya;
  const margin = pendapatan > 0 ? (laba / pendapatan) * 100 : null;
  return { pendapatan, biaya, laba, margin };
}

// Total Transaksi = Transfer + E-Wallet + Tarik Tunai dari TransactionTellerBreakdown
// (field tf/eWallet/itTt) - bukan jumlah baris laporan (lihat catatan di getDashboardDetailCabang).
export function hitungTransaksiBreakdown(transaksi: TxRow[]) {
  let transfer = 0;
  let eWallet = 0;
  let tarikTunai = 0;
  for (const tx of transaksi) {
    for (const t of tx.tellerBreakdown) {
      transfer += Number(t.tf);
      eWallet += Number(t.eWallet);
      tarikTunai += Number(t.itTt);
    }
  }
  return { transfer, eWallet, tarikTunai, totalTransaksi: transfer + eWallet + tarikTunai };
}

export function buatGrowth(sekarang: number, sebelumnya: number | null): Growth {
  if (sebelumnya === null || sebelumnya === 0) {
    return { persen: null, label: "Belum dapat dibandingkan" };
  }
  const persen = pertumbuhanPersen(sekarang, sebelumnya);
  return { persen, label: persen === null ? "Belum dapat dibandingkan" : "" };
}

export async function getDashboardKpi(params: {
  branchId?: string;
  startDate: Date;
  endDate: Date;
  comparisonMode: PeriodeMode;
}): Promise<DashboardKpi> {
  const { branchId, startDate, endDate, comparisonMode } = params;

  const [totalCabang, totalKaryawan, itemCount, levels, gajiPeriode, transaksi] = await Promise.all([
    db.branch.count({ where: { isActive: true } }),
    db.employee.count({ where: { isActive: true, ...(branchId ? { branchId } : {}) } }),
    db.item.count({ where: { isActive: true } }),
    hitungStockLevels(),
    db.payroll.aggregate({
      where: {
        periodYear: startDate.getUTCFullYear(),
        periodMonth: startDate.getUTCMonth() + 1,
        ...(branchId ? { employee: { branchId } } : {}),
      },
      _sum: { totalGajiKotor: true },
    }),
    fetchTransaksiPeriode(branchId, startDate, endDate),
  ]);
  const totalStock = levels
    .filter((l) => !branchId || l.branchId === branchId)
    .reduce((sum, l) => sum + l.qty, 0);

  const { pendapatan, biaya, laba, margin } = hitungPendapatanBiayaLaba(transaksi);
  const { transfer, eWallet, tarikTunai, totalTransaksi } = hitungTransaksiBreakdown(transaksi);
  const adaDataRincianTransaksi = transaksi.some((tx) => tx.tellerBreakdown.length > 0);

  const { prevStart, prevEnd, pembandingLabel, scaleToPeriodLength } = resolveComparablePeriod(
    startDate,
    endDate,
    comparisonMode
  );
  const prevTransaksi = await fetchTransaksiPeriode(branchId, prevStart, prevEnd);
  const prevFinansial = hitungPendapatanBiayaLaba(prevTransaksi);
  const prevBreakdown = hitungTransaksiBreakdown(prevTransaksi);

  let prevPendapatanBaseline = prevFinansial.pendapatan;
  let prevTransaksiBaseline = prevBreakdown.totalTransaksi;
  if (scaleToPeriodLength) {
    const hariPembanding = periodeLengthDays(prevStart, prevEnd) || 1;
    const hariPeriode = periodeLengthDays(startDate, endDate);
    prevPendapatanBaseline = (prevFinansial.pendapatan / hariPembanding) * hariPeriode;
    prevTransaksiBaseline = (prevBreakdown.totalTransaksi / hariPembanding) * hariPeriode;
  }

  const hariLaporanTerinput = new Set(transaksi.map((tx) => tx.date.toISOString())).size;
  // Ekek tidak punya field status BUKA/LIBUR pada DailyTransaction (beda dari
  // wilayah lain) - jadi "Hari Operasional" di sini murni hari kalender pada
  // periode, tanpa pengurangan hari libur (belum ada data itu untuk dikurangi).
  const hariKalender = periodeLengthDays(startDate, endDate);
  const hariOperasional = hariKalender;
  const hariBelumInput = Math.max(0, hariKalender - hariLaporanTerinput);
  const kelengkapanDataPersen = hariOperasional > 0 ? (hariLaporanTerinput / hariOperasional) * 100 : null;

  const inputTerakhir = transaksi.length > 0 ? transaksi[transaksi.length - 1].date : null;

  return {
    totalCabang,
    totalKaryawan,
    totalItem: itemCount,
    totalStock,
    gajiBulanIni: Number(gajiPeriode._sum.totalGajiKotor ?? 0),
    totalPendapatan: pendapatan,
    totalBiaya: biaya,
    labaOperasional: laba,
    marginOperasional: margin,
    totalTransaksi,
    transfer,
    eWallet,
    tarikTunai,
    hariLaporanTerinput,
    hariOperasional,
    hariBelumInput,
    kelengkapanDataPersen,
    inputTerakhir,
    pertumbuhanPendapatan: buatGrowth(pendapatan, prevPendapatanBaseline),
    pertumbuhanTransaksi: buatGrowth(totalTransaksi, prevTransaksiBaseline),
    periodeLabel: `${fmtTanggalPendek(startDate)} - ${fmtTanggalPendek(new Date(endDate.getTime() - 86400000))}`,
    pembandingLabel,
    adaDataRincianTransaksi,
  };
}

export async function getDashboardTrend(
  mode: "keuangan" | "transaksi",
  branchId: string | undefined,
  bulanTerakhir = 6
): Promise<TrendPoint[]> {
  const now = new Date();
  const result: TrendPoint[] = [];

  for (let i = bulanTerakhir - 1; i >= 0; i--) {
    const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = targetDate.getUTCFullYear();
    const month = targetDate.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const transaksi = await fetchTransaksiPeriode(branchId, monthStart, monthEnd);
    const { pendapatan, biaya, laba } = hitungPendapatanBiayaLaba(transaksi);
    const { transfer, eWallet, tarikTunai, totalTransaksi } = hitungTransaksiBreakdown(transaksi);

    result.push({
      bulan: `${BULAN_SINGKAT[month - 1]} ${year}`,
      pendapatan,
      biaya,
      laba,
      totalTransaksi,
      transfer,
      eWallet,
      tarikTunai,
    });
  }

  void mode; // mode dipakai di layer komponen untuk memilih seri mana yang ditampilkan
  return result;
}

export async function getKomposisiTransaksi(branchId: string | undefined, startDate: Date, endDate: Date): Promise<KomposisiTransaksi[]> {
  const transaksi = await fetchTransaksiPeriode(branchId, startDate, endDate);
  const { transfer, eWallet, tarikTunai, totalTransaksi } = hitungTransaksiBreakdown(transaksi);
  if (totalTransaksi === 0) return [];

  return [
    { kategori: "Transfer", jumlah: transfer, persen: (transfer / totalTransaksi) * 100 },
    { kategori: "E-Wallet", jumlah: eWallet, persen: (eWallet / totalTransaksi) * 100 },
    { kategori: "Tarik Tunai", jumlah: tarikTunai, persen: (tarikTunai / totalTransaksi) * 100 },
  ];
}

export async function getTransaksiPerJenis(params: {
  branchId?: string;
  startDate: Date;
  endDate: Date;
  comparisonMode: PeriodeMode;
}): Promise<TransaksiPerJenisRow[]> {
  const { branchId, startDate, endDate, comparisonMode } = params;
  const transaksi = await fetchTransaksiPeriode(branchId, startDate, endDate);
  const current = hitungTransaksiBreakdown(transaksi);
  const hariOperasional = Math.max(1, periodeLengthDays(startDate, endDate));

  const { prevStart, prevEnd } = resolveComparablePeriod(startDate, endDate, comparisonMode);
  const prevTransaksi = await fetchTransaksiPeriode(branchId, prevStart, prevEnd);
  const prev = hitungTransaksiBreakdown(prevTransaksi);

  if (current.totalTransaksi === 0) return [];

  const rows: { jenis: TransaksiPerJenisRow["jenis"]; total: number; prevTotal: number }[] = [
    { jenis: "Transfer", total: current.transfer, prevTotal: prev.transfer },
    { jenis: "E-Wallet", total: current.eWallet, prevTotal: prev.eWallet },
    { jenis: "Tarik Tunai", total: current.tarikTunai, prevTotal: prev.tarikTunai },
  ];

  return rows.map((r) => {
    const growth = r.prevTotal > 0 ? pertumbuhanPersen(r.total, r.prevTotal) : null;
    return {
      jenis: r.jenis,
      total: r.total,
      rataRataHarian: r.total / hariOperasional,
      kontribusiPersen: (r.total / current.totalTransaksi) * 100,
      pertumbuhanPersen: growth,
      tren: growth === null ? "Stabil" : growth > 2 ? "Naik" : growth < -2 ? "Turun" : "Stabil",
    };
  });
}

// 3 skenario memakai fungsi proyeksi yang sudah tervalidasi di modul Analisis
// (lib/forecast/forecast.ts) - cuma dipetakan labelnya.
export async function getProyeksiAkhirBulan(branchId?: string): Promise<{
  pendapatan: ProyeksiSkenario[];
  totalTransaksi: ProyeksiSkenario[];
}> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const totalHariBulan = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

  const transaksi = await fetchTransaksiPeriode(branchId, monthStart, monthEnd);

  const pendapatanHarian = transaksi.map((tx) => hitungTotalPendapatan(tx));
  const transaksiHarian = transaksi.map((tx) =>
    tx.tellerBreakdown.reduce((sum, t) => sum + Number(t.tf) + Number(t.eWallet) + Number(t.itTt), 0)
  );

  const labelMap = ["Konservatif", "Realistis", "Optimistis"] as const;
  const proyeksiPendapatan = hitungProyeksiAkhirBulan(pendapatanHarian, transaksi.length, totalHariBulan);
  const proyeksiTransaksi = hitungProyeksiAkhirBulan(transaksiHarian, transaksi.length, totalHariBulan);

  return {
    pendapatan: proyeksiPendapatan.map((p, i) => ({ skenario: labelMap[i], nilai: p.proyeksi })),
    totalTransaksi: proyeksiTransaksi.map((p, i) => ({ skenario: labelMap[i], nilai: p.proyeksi })),
  };
}

// Status cabang multi-faktor (bukan cuma nominal omset).
function tentukanStatusCabang(params: {
  isActive: boolean;
  hariLaporanTerinput: number;
  kelengkapanDataPersen: number | null;
  laba: number;
  margin: number | null;
  pertumbuhanPendapatan: number | null;
}): { status: StatusCabangDashboard; alasan: string } {
  const { isActive, hariLaporanTerinput, kelengkapanDataPersen, laba, margin, pertumbuhanPendapatan } = params;

  if (!isActive) return { status: "Belum Beroperasi", alasan: "Cabang belum aktif." };
  if (hariLaporanTerinput < 5 || kelengkapanDataPersen === null) {
    return { status: "Data Belum Cukup", alasan: "Laporan harian pada periode ini masih terlalu sedikit untuk dinilai." };
  }
  if (kelengkapanDataPersen < 75) {
    return {
      status: "Data Belum Cukup",
      alasan: `Kelengkapan data baru ${kelengkapanDataPersen.toFixed(1)}%, analisis belum sepenuhnya akurat.`,
    };
  }

  let skor = 0;
  const catatan: string[] = [];
  if (laba >= 0) {
    skor += 1;
    catatan.push("laba positif");
  } else {
    catatan.push("laba negatif");
  }
  if (margin !== null && margin >= 15) {
    skor += 1;
    catatan.push("margin sehat");
  } else if (margin !== null) {
    catatan.push(`margin ${margin.toFixed(1)}%`);
  }
  if (pertumbuhanPendapatan !== null) {
    if (pertumbuhanPendapatan >= 5) {
      skor += 1;
      catatan.push(`pendapatan tumbuh ${pertumbuhanPendapatan.toFixed(1)}%`);
    } else if (pertumbuhanPendapatan <= -15) {
      skor -= 1;
      catatan.push(`transaksi turun tajam ${Math.abs(pertumbuhanPendapatan).toFixed(1)}%`);
    } else {
      catatan.push(`pendapatan relatif stabil (${pertumbuhanPendapatan >= 0 ? "+" : ""}${pertumbuhanPendapatan.toFixed(1)}%)`);
    }
  }

  let status: StatusCabangDashboard;
  if (laba < 0) status = skor <= -1 ? "Perlu Evaluasi" : "Perlu Dipantau";
  else if (skor >= 3) status = "Sangat Baik";
  else if (skor >= 2) status = "Baik";
  else if (skor >= 0) status = "Perlu Dipantau";
  else status = "Perlu Evaluasi";

  return { status, alasan: catatan.join(", ") };
}

export async function getDashboardDetailCabang(params: {
  startDate: Date;
  endDate: Date;
  comparisonMode: PeriodeMode;
}): Promise<DetailCabangDashboard[]> {
  const { startDate, endDate, comparisonMode } = params;
  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });
  const { prevStart, prevEnd, scaleToPeriodLength } = resolveComparablePeriod(startDate, endDate, comparisonMode);

  return Promise.all(
    branches.map(async (branch) => {
      const [transaksi, prevTransaksi] = await Promise.all([
        fetchTransaksiPeriode(branch.id, startDate, endDate),
        fetchTransaksiPeriode(branch.id, prevStart, prevEnd),
      ]);

      const { pendapatan, biaya, laba, margin } = hitungPendapatanBiayaLaba(transaksi);
      // Total Transaksi = jumlah dari TransactionTellerBreakdown (tf+eWallet+itTt),
      // BUKAN transaksi.length (jumlah baris laporan harian) - baris laporan cuma
      // menghitung berapa hari sudah diinput, bukan berapa transaksi nasabah.
      const { transfer, eWallet, tarikTunai, totalTransaksi } = hitungTransaksiBreakdown(transaksi);
      const prevFinansial = hitungPendapatanBiayaLaba(prevTransaksi);

      let prevBaseline = prevFinansial.pendapatan;
      if (scaleToPeriodLength) {
        const hariPembanding = periodeLengthDays(prevStart, prevEnd) || 1;
        prevBaseline = (prevFinansial.pendapatan / hariPembanding) * periodeLengthDays(startDate, endDate);
      }
      const pertumbuhanPendapatan = prevBaseline > 0 ? pertumbuhanPersen(pendapatan, prevBaseline) : null;

      const hariLaporanTerinput = transaksi.length;
      const hariOperasional = periodeLengthDays(startDate, endDate);
      const kelengkapanDataPersen = hariOperasional > 0 ? (hariLaporanTerinput / hariOperasional) * 100 : null;

      const { status, alasan } = tentukanStatusCabang({
        isActive: branch.isActive,
        hariLaporanTerinput,
        kelengkapanDataPersen,
        laba,
        margin,
        pertumbuhanPendapatan,
      });

      return {
        branchId: branch.id,
        branchName: branch.name,
        isActive: branch.isActive,
        pendapatan,
        biaya,
        laba,
        margin,
        totalTransaksi,
        transfer,
        eWallet,
        tarikTunai,
        pertumbuhanPendapatan,
        kelengkapanDataPersen,
        status,
        alasanStatus: alasan,
      };
    })
  );
}

export async function getStockKritis(threshold?: number) {
  const [items, levels, settings] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    hitungStockLevels(),
    getAppSettings(),
  ]);
  const effectiveThreshold = threshold ?? settings.stockKritisThreshold;

  const totalPerItem = new Map<string, number>();
  for (const level of levels) {
    totalPerItem.set(level.itemId, (totalPerItem.get(level.itemId) ?? 0) + level.qty);
  }

  return items
    .map((item) => ({ itemId: item.id, name: item.name, total: totalPerItem.get(item.id) ?? 0 }))
    .filter((item) => item.total < effectiveThreshold)
    .sort((a, b) => a.total - b.total);
}

function formatRupiahSingkat(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n.toFixed(0)}`;
}

// Insight otomatis dari data aktual, bukan teks statis.
export function buatInsightDashboard(params: {
  kpi: DashboardKpi;
  komposisi: KomposisiTransaksi[];
  transaksiPerJenis: TransaksiPerJenisRow[];
  detailCabang: DetailCabangDashboard[];
  proyeksi: { pendapatan: ProyeksiSkenario[] };
}): string[] {
  const { kpi, komposisi, transaksiPerJenis, detailCabang, proyeksi } = params;
  const insight: string[] = [];

  if (kpi.pertumbuhanPendapatan.persen !== null) {
    const arah = kpi.pertumbuhanPendapatan.persen >= 0 ? "tumbuh" : "turun";
    insight.push(`Pendapatan ${arah} ${Math.abs(kpi.pertumbuhanPendapatan.persen).toFixed(1)}% dibanding ${kpi.pembandingLabel.toLowerCase()}.`);
  }

  if (komposisi.length > 0) {
    const terbesar = [...komposisi].sort((a, b) => b.jumlah - a.jumlah)[0];
    insight.push(`${terbesar.kategori} merupakan layanan terbesar dengan kontribusi ${terbesar.persen.toFixed(1)}%.`);
  }

  const naik = transaksiPerJenis.filter((r) => r.tren === "Naik").sort((a, b) => (b.pertumbuhanPersen ?? 0) - (a.pertumbuhanPersen ?? 0));
  if (naik.length > 0) {
    insight.push(`${naik[0].jenis} memiliki pertumbuhan tertinggi (${naik[0].pertumbuhanPersen!.toFixed(1)}%).`);
  }
  const turun = transaksiPerJenis.filter((r) => r.tren === "Turun");
  if (turun.length > 0) {
    insight.push(`${turun.map((t) => t.jenis).join(", ")} mengalami penurunan dibanding periode sebelumnya.`);
  }

  if (kpi.kelengkapanDataPersen !== null && kpi.kelengkapanDataPersen < 100) {
    insight.push(`Kelengkapan data baru ${kpi.kelengkapanDataPersen.toFixed(1)}%, sehingga analisis belum sepenuhnya akurat.`);
  }

  if (proyeksi.pendapatan.length === 3) {
    insight.push(
      `Proyeksi pendapatan akhir bulan berada pada rentang ${formatRupiahSingkat(proyeksi.pendapatan[0].nilai)} sampai ${formatRupiahSingkat(proyeksi.pendapatan[2].nilai)}.`
    );
  }

  const cabangAktif = detailCabang.filter((c) => c.isActive && c.margin !== null);
  if (cabangAktif.length > 0) {
    const marginTertinggi = [...cabangAktif].sort((a, b) => (b.margin ?? -Infinity) - (a.margin ?? -Infinity))[0];
    insight.push(`Cabang ${marginTertinggi.branchName} memiliki margin tertinggi (${marginTertinggi.margin!.toFixed(1)}%).`);
  }

  return insight;
}

export { rataRata };
