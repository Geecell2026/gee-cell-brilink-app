import {
  getKpiSummary,
  getTrendOmsetBulanan,
  getDetailPerCabang,
  getStockKritis,
  type StatusCabang,
} from "@/lib/calculations/dashboard";
import { getAppSettings } from "@/lib/calculations/settings";
import { TrendOmsetChart } from "@/components/trend-omset-chart";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_BADGE: Record<StatusCabang, string> = {
  "Sangat Baik": "bg-green-100 text-green-700",
  Baik: "bg-blue-100 text-blue-700",
  "Perlu Perhatian": "bg-amber-100 text-amber-700",
  Rendah: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [kpi, trend, detailCabang, stockKritis, settings] = await Promise.all([
    getKpiSummary(year, month),
    getTrendOmsetBulanan(6),
    getDetailPerCabang(year, month),
    getStockKritis(),
    getAppSettings(),
  ]);

  const kpiCards = [
    { label: "Total Cabang", value: kpi.totalCabang },
    { label: "Total Karyawan", value: kpi.totalKaryawan },
    { label: "Omset Bulan Ini", value: formatRupiah(kpi.omsetBulanIni) },
    { label: "Total Produk", value: kpi.totalItem },
    { label: "Total Stock", value: kpi.totalStock },
    { label: "Gaji Bulan Ini", value: formatRupiah(kpi.gajiBulanIni) },
  ];

  const periode = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">Rekap omset &amp; operasional Wilayah Ekek</p>
        </div>
        <a
          href={`/api/export?periode=${periode}`}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
        >
          Export Excel (Bulan Ini)
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800">Trend Omset 6 Bulan Terakhir</h2>
        <TrendOmsetChart data={trend} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800">Detail Per Cabang (Bulan Ini)</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="py-2">Cabang</th>
              <th className="py-2 text-right">Omset</th>
              <th className="py-2 text-right">Transaksi</th>
              <th className="py-2 text-right">Karyawan</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {detailCabang.map((row) => (
              <tr key={row.branchId} className="border-b border-neutral-100 last:border-0">
                <td className="py-2">{row.branchName}</td>
                <td className="py-2 text-right">{formatRupiah(row.omset)}</td>
                <td className="py-2 text-right">{row.transaksi}</td>
                <td className="py-2 text-right">{row.karyawan}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800">
          Analisis Stock Kritis (di bawah {settings.stockKritisThreshold} pcs total)
        </h2>
        {stockKritis.length === 0 ? (
          <p className="text-sm text-neutral-400">Tidak ada item dengan stock kritis.</p>
        ) : (
          <ul className="space-y-1">
            {stockKritis.map((item) => (
              <li key={item.itemId} className="flex justify-between text-sm">
                <span className="text-neutral-700">{item.name}</span>
                <span className="font-medium text-red-600">{item.total} pcs</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
