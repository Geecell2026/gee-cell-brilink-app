import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { markPayrollPaid } from "@/actions/payroll";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payroll = await db.payroll.findUnique({ where: { id }, include: { employee: true } });
  if (!payroll) notFound();

  const rows: [string, string][] = [
    ["Gaji Pokok", formatRupiah(Number(payroll.gajiPokokSnapshot))],
    ["Hari Efektif Kerja", `${payroll.hariEfektifKerja} hari`],
    ["Total Masuk (Hadir)", `${payroll.totalMasuk} hari`],
    ["Gaji per Hari", formatRupiah(Number(payroll.gajiPerHari))],
    ["Gaji Pokok (Prorata)", formatRupiah(Number(payroll.gajiPokokProrata))],
    ["Hari Lembur", `${payroll.hariLembur} hari`],
    ["Gaji Lembur", formatRupiah(Number(payroll.gajiLembur))],
    ["Bonus", formatRupiah(Number(payroll.bonus))],
    ["THR", formatRupiah(Number(payroll.thr))],
    ["Total Gaji Kotor", formatRupiah(Number(payroll.totalGajiKotor))],
    ["Kasbon Dipotong", `- ${formatRupiah(Number(payroll.totalKasbonDipotong))}`],
  ];

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Slip Gaji</h1>
        <p className="text-sm text-neutral-500">
          {payroll.employee.name} — {BULAN[payroll.periodMonth - 1]} {payroll.periodYear}
        </p>
      </div>

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2 text-sm">
            <span className="text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-800">{value}</span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 text-base">
          <span className="font-semibold text-neutral-900">Sisa Gaji Diterima</span>
          <span className="font-semibold text-neutral-900">{formatRupiah(Number(payroll.sisaGaji))}</span>
        </div>
      </div>

      {payroll.status === "DRAFT" ? (
        <form
          action={async () => {
            "use server";
            await markPayrollPaid(payroll.id);
          }}
        >
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Tandai Sudah Dibayar
          </button>
        </form>
      ) : (
        <p className="text-sm text-green-700">
          Sudah dibayar pada {payroll.paidAt?.toLocaleDateString("id-ID")}
        </p>
      )}
    </div>
  );
}
