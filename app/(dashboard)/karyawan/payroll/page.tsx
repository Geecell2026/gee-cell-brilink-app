import Link from "next/link";
import { db } from "@/lib/db";
import { GeneratePayrollForm } from "@/components/generate-payroll-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const periode = params.periode || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = periode.split("-");

  const payrolls = await db.payroll.findMany({
    where: { periodYear: Number(yearStr), periodMonth: Number(monthStr) },
    include: { employee: true },
    orderBy: { employee: { name: "asc" } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Payroll</h1>
        <p className="text-sm text-neutral-500">Generate &amp; lihat slip gaji per periode</p>
      </div>

      <GeneratePayrollForm defaultPeriode={periode} />

      <form className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          type="month"
          name="periode"
          defaultValue={periode}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Lihat Periode
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Karyawan</th>
              <th className="px-3 py-2 text-right">Hari Efektif</th>
              <th className="px-3 py-2 text-right">Total Masuk</th>
              <th className="px-3 py-2 text-right">Lembur</th>
              <th className="px-3 py-2 text-right">Total Gaji Kotor</th>
              <th className="px-3 py-2 text-right">Kasbon</th>
              <th className="px-3 py-2 text-right">Sisa Gaji</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada payroll untuk periode ini. Klik Generate Payroll.
                </td>
              </tr>
            )}
            {payrolls.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{p.employee.name}</td>
                <td className="px-3 py-2 text-right">{p.hariEfektifKerja}</td>
                <td className="px-3 py-2 text-right">{p.totalMasuk}</td>
                <td className="px-3 py-2 text-right">{p.hariLembur}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(p.totalGajiKotor))}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(p.totalKasbonDipotong))}</td>
                <td className="px-3 py-2 text-right font-medium">{formatRupiah(Number(p.sisaGaji))}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      p.status === "PAID"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/karyawan/payroll/${p.id}`} className="text-xs text-neutral-600 hover:underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
