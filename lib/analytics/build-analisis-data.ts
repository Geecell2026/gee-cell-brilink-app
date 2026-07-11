import { getRawTransaksiData } from "./data-source";
import { perkayaDailyPoints, agregasiMingguan, agregasiBulanan, polaPerHari } from "./aggregation";
import { hitungStatistikDeskriptif, klasifikasiStabilitas, movingAverage, pertumbuhanPersen } from "./statistics";
import { deteksiAnomali } from "./anomaly";
import { hitungForecast, hitungProyeksiAkhirBulan, estimasiBulanBerikutnya } from "@/lib/forecast/forecast";
import { buatInsightOtomatis } from "./insight";
import { nilaiPerforma } from "./performance";
import type { DailyPoint } from "@/types/analytics";

export type AnalisisFilter = {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  hariFilter?: string[]; // nama hari, misal ["Jumat", "Sabtu"]
};

// MA14 butuh look-back 13 entri sebelum awal window - dilebihkan jadi 30 hari
// kalender supaya tetap cukup walau "Semua Cabang" dipilih (banyak baris per
// hari) atau data harian jarang (sedikit baris per hari).
const MA_BUFFER_HARI = 30;

export async function buildAnalisisData(filter: AnalisisFilter, targetTransaksiHarian: number | null) {
  // allPoints dipakai lagi di bawah untuk pertumbuhanPeriode (bandingkan ke
  // periode sebelumnya dengan panjang yang sama) - jadi batas fetch-nya harus
  // mundur sejauh itu, bukan cuma sejak filter.startDate. maBufferStart dipakai
  // supaya MA7/MA14 di beberapa hari pertama window punya look-back asli
  // (bukan null) - lihat perhitungan ma7/ma14 di bawah.
  let sejakTanggal: Date | undefined;
  let maBufferStart: Date | undefined;
  if (filter.startDate && filter.endDate) {
    const periodeSebelumnyaStart = new Date(
      filter.startDate.getTime() - (filter.endDate.getTime() - filter.startDate.getTime())
    );
    maBufferStart = new Date(filter.startDate.getTime() - MA_BUFFER_HARI * 86400000);
    sejakTanggal =
      periodeSebelumnyaStart.getTime() < maBufferStart.getTime() ? periodeSebelumnyaStart : maBufferStart;
  }
  const raw = await getRawTransaksiData(filter.branchId, sejakTanggal, filter.endDate);
  const allPoints = perkayaDailyPoints(raw);

  let points: DailyPoint[] = allPoints;
  if (filter.startDate) points = points.filter((p) => p.date.getTime() >= filter.startDate!.getTime());
  if (filter.endDate) points = points.filter((p) => p.date.getTime() < filter.endDate!.getTime());
  if (filter.hariFilter && filter.hariFilter.length > 0) {
    points = points.filter((p) => filter.hariFilter!.includes(p.namaHari));
  }
  points = points.sort((a, b) => a.date.getTime() - b.date.getTime());

  const values = points.map((p) => p.totalTransaksi);
  const stats = hitungStatistikDeskriptif(values);
  const stabilitas = klasifikasiStabilitas(stats.koefisienVariasi);

  // ma7/ma14 dihitung dari deret yang dilebarkan ke belakang (maBufferStart..endDate)
  // supaya hari-hari pertama window tidak otomatis null karena kekurangan look-back,
  // lalu dipotong ke panjang `points` di ujung deret hasilnya (index-nya tetap
  // selaras 1:1 dengan `points`, dipakai chart-helpers.ts). `points`/`values`/`stats`
  // sendiri TIDAK ikut melebar - tetap persis window filter aktif seperti sebelumnya.
  const pointsUntukMA = maBufferStart
    ? allPoints
        .filter((p) => p.date.getTime() >= maBufferStart!.getTime() && p.date.getTime() < filter.endDate!.getTime())
        .filter((p) => !filter.hariFilter?.length || filter.hariFilter.includes(p.namaHari))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    : points;
  const valuesUntukMA = pointsUntukMA.map((p) => p.totalTransaksi);
  const ma7Full = movingAverage(valuesUntukMA, 7);
  const ma14Full = movingAverage(valuesUntukMA, 14);
  const ma7 = points.length > 0 ? ma7Full.slice(ma7Full.length - points.length) : [];
  const ma14 = points.length > 0 ? ma14Full.slice(ma14Full.length - points.length) : [];

  const mingguan = agregasiMingguan(points);
  const bulanan = agregasiBulanan(points);
  const polaHari = polaPerHari(points);
  const anomali = deteksiAnomali(points);
  const forecast = values.length > 0 ? hitungForecast(values) : [];

  const now = new Date();
  const bulanIniPoints = points.filter(
    (p) => p.bulan === now.getUTCMonth() + 1 && p.tahun === now.getUTCFullYear()
  );
  const hariOperasionalBulanIni = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const proyeksiAkhirBulan =
    bulanIniPoints.length > 0
      ? hitungProyeksiAkhirBulan(
          bulanIniPoints.map((p) => p.totalTransaksi),
          bulanIniPoints.length,
          hariOperasionalBulanIni
        )
      : [];

  const bulanDepan = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const hariOperasionalBulanDepan = new Date(
    Date.UTC(bulanDepan.getUTCFullYear(), bulanDepan.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const estimasiBulanDepan =
    proyeksiAkhirBulan.length > 0
      ? estimasiBulanBerikutnya(proyeksiAkhirBulan, hariOperasionalBulanIni, hariOperasionalBulanDepan)
      : null;

  const persenPencapaianTarget =
    targetTransaksiHarian && targetTransaksiHarian > 0 && stats.rataRata > 0
      ? (stats.rataRata / targetTransaksiHarian) * 100
      : null;

  const insight = buatInsightOtomatis({ points, bulanan, mingguan, polaHari, stats, estimasiBulanDepan });
  const performa = nilaiPerforma({ bulanan, stats, points, persenPencapaianTarget });

  // KPI: pertumbuhan periode ini vs periode sebelumnya dengan panjang yang sama.
  let pertumbuhanPeriode: number | null = null;
  if (filter.startDate && filter.endDate && points.length > 0) {
    const durasiMs = filter.endDate.getTime() - filter.startDate.getTime();
    const periodeSebelumnyaStart = new Date(filter.startDate.getTime() - durasiMs);
    const periodeSebelumnya = allPoints.filter(
      (p) => p.date.getTime() >= periodeSebelumnyaStart.getTime() && p.date.getTime() < filter.startDate!.getTime()
    );
    const totalSebelumnya = periodeSebelumnya.reduce((s, p) => s + p.totalTransaksi, 0);
    pertumbuhanPeriode = pertumbuhanPersen(stats.total, totalSebelumnya);
  }

  return {
    points,
    allPoints,
    stats,
    stabilitas,
    ma7,
    ma14,
    mingguan,
    bulanan,
    polaHari,
    anomali,
    forecast,
    proyeksiAkhirBulan,
    estimasiBulanDepan,
    persenPencapaianTarget,
    insight,
    performa,
    pertumbuhanPeriode,
    targetTransaksiHarian,
  };
}

export type AnalisisData = Awaited<ReturnType<typeof buildAnalisisData>>;
