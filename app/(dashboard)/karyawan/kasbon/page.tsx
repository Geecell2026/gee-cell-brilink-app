import { db } from "@/lib/db";
import { KasbonForm } from "@/components/kasbon-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function KasbonPage() {
  const [employees, kasbons] = await Promise.all([
    db.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.kasbon.findMany({
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Kasbon</h1>
        <p className="text-sm text-neutral-500">Uang muka/pinjaman karyawan</p>
      </div>

      <KasbonForm employees={employees} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Karyawan</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {kasbons.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada kasbon.
                </td>
              </tr>
            )}
            {kasbons.map((k) => (
              <tr key={k.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{k.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{k.employee.name}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(k.amount))}</td>
                <td className="px-3 py-2">{k.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
