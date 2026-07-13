import { db } from "@/lib/db";
import { BranchForm } from "@/components/branch-form";
import { BranchOperationalForm } from "@/components/branch-operational-form";
import { toggleBranchActive } from "@/actions/cabang";

export default async function CabangPage() {
  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Cabang</h1>
        <p className="text-sm text-neutral-500">Master data cabang Wilayah Ekek</p>
      </div>

      <BranchForm />

      <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
        <span className="font-medium">Status</span> menggambarkan kondisi cabang saat ini (Aktif/Nonaktif) - histori
        operasional (dipakai Dashboard, Kelengkapan Data, Deteksi Anomali, Kontribusi Tren) tetap ditentukan oleh{" "}
        <span className="font-medium">Mulai Operasi</span> dan <span className="font-medium">Tutup Operasi</span>,
        bukan status ini.
      </p>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Periode Operasional</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-neutral-100 last:border-0 align-top">
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2">{b.code}</td>
                <td className="px-3 py-2">
                  <BranchOperationalForm branch={b} />
                </td>
                <td className="px-3 py-2">
                  {b.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktif</span>
                  ) : (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">Nonaktif</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await toggleBranchActive(b.id);
                    }}
                  >
                    <button className="text-xs text-neutral-600 hover:underline">
                      {b.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
