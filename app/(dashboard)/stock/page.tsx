import Link from "next/link";
import { db } from "@/lib/db";
import { hitungStockLevels } from "@/lib/calculations/stock";

export default async function StockPage() {
  const [items, branches, levels] = await Promise.all([
    db.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    hitungStockLevels(),
  ]);

  function getQty(itemId: string, branchId: string | null) {
    return levels.find((l) => l.itemId === itemId && l.branchId === branchId)?.qty ?? 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Rekap Stock</h1>
          <p className="text-sm text-neutral-500">Stock akhir per item, dihitung dari histori pergerakan</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/stock/item"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Master Item
          </Link>
          <Link
            href="/stock/pembelian"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            + Pembelian
          </Link>
          <Link
            href="/stock/distribusi"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Distribusi
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="sticky left-0 bg-neutral-50 px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Gudang</th>
              {branches.map((b) => (
                <th key={b.id} className="px-3 py-2 text-right">
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={2 + branches.length} className="px-3 py-6 text-center text-neutral-400">
                  Belum ada item stock. Tambahkan lewat Master Item.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2 text-right">{getQty(item.id, null)}</td>
                {branches.map((b) => (
                  <td key={b.id} className="px-3 py-2 text-right">
                    {getQty(item.id, b.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
