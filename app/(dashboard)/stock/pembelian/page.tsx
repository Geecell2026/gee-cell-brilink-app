import { db } from "@/lib/db";
import { PembelianForm } from "@/components/pembelian-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function PembelianPage() {
  const [items, purchases] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.stockMovement.findMany({
      where: { type: "PEMBELIAN" },
      include: { item: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Pembelian ke Gudang</h1>
        <p className="text-sm text-neutral-500">Stock masuk dari supplier</p>
      </div>

      <PembelianForm items={items} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Pcs</th>
              <th className="px-3 py-2 text-right">HPP/Pcs</th>
              <th className="px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada pembelian.
                </td>
              </tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{p.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{p.item.name}</td>
                <td className="px-3 py-2 text-right">{p.qty}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(p.unitCost ?? 0))}</td>
                <td className="px-3 py-2">{p.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
