import { db } from "@/lib/db";
import { EmployeeForm } from "@/components/employee-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function KaryawanPage() {
  const [branches, employees] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.employee.findMany({
      where: { isActive: true },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Karyawan</h1>
        <p className="text-sm text-neutral-500">Master data karyawan aktif</p>
      </div>

      <EmployeeForm branches={branches} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Cabang</th>
              <th className="px-3 py-2">Jabatan</th>
              <th className="px-3 py-2 text-right">Gaji Pokok</th>
              <th className="px-3 py-2">Tanggal Masuk</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                  Belum ada karyawan.
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.branch.name}</td>
                <td className="px-3 py-2">{e.position}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(e.gajiPokok))}</td>
                <td className="px-3 py-2">{e.tanggalMasuk.toLocaleDateString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
