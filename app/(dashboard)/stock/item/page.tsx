import { db } from "@/lib/db";
import { ItemForm } from "@/components/item-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function ItemPage() {
  const items = await db.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Master Item</h1>
        <p className="text-sm text-neutral-500">Daftar produk/aset untuk stock</p>
      </div>

      <ItemForm />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Satuan</th>
              <th className="px-3 py-2 text-right">HPP</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                  Belum ada item.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">{item.unit}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(item.hpp))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
