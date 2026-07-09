import { db } from "@/lib/db";
import { DistribusiForm } from "@/components/distribusi-form";

export default async function DistribusiPage() {
  const [items, branches, distributions] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.stockMovement.findMany({
      where: { type: "DISTRIBUSI", direction: "IN" },
      include: { item: true, branch: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Distribusi ke Cabang</h1>
        <p className="text-sm text-neutral-500">Gudang → Cabang</p>
      </div>

      <DistribusiForm items={items} branches={branches} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Cabang Tujuan</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {distributions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                  Belum ada distribusi.
                </td>
              </tr>
            )}
            {distributions.map((d) => (
              <tr key={d.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{d.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{d.item.name}</td>
                <td className="px-3 py-2">{d.branch?.name}</td>
                <td className="px-3 py-2 text-right">{d.qty}</td>
                <td className="px-3 py-2">{d.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
