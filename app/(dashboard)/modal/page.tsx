import Link from "next/link";
import { db } from "@/lib/db";
import { CapexForm } from "@/components/capex-form";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function ModalPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const params = await searchParams;
  const [branches, entries] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.capexEntry.findMany({
      where: params.branchId ? { branchId: params.branchId } : {},
      include: { branch: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const total = entries.reduce((sum, e) => sum + Number(e.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Modal / Capex</h1>
          <p className="text-sm text-neutral-500">Total: {formatRupiah(total)}</p>
        </div>
        <Link
          href="/modal/piutang"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
        >
          Piutang Antar Orang
        </Link>
      </div>

      <CapexForm branches={branches} />

      <form className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <select
          name="branchId"
          defaultValue={params.branchId || ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Semua Cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Cabang</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Harga Satuan</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada catatan modal/capex.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{e.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{e.branch.name}</td>
                <td className="px-3 py-2">{e.category}</td>
                <td className="px-3 py-2">{e.keterangan}</td>
                <td className="px-3 py-2 text-right">{e.qty}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(e.hargaSatuan))}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(e.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
