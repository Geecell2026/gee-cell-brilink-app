import { db } from "@/lib/db";
import { LoanForm } from "@/components/loan-form";
import { markLoanSettled } from "@/actions/modal";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function PiutangPage() {
  const [branches, loans] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.interPersonLoan.findMany({
      include: { branch: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Piutang Antar Orang</h1>
        <p className="text-sm text-neutral-500">Uang titip/PV antar owner/mitra, bukan karyawan formal</p>
      </div>

      <LoanForm branches={branches} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Dari</th>
              <th className="px-3 py-2">Ke</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2">Cabang</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada catatan piutang.
                </td>
              </tr>
            )}
            {loans.map((l) => (
              <tr key={l.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{l.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{l.fromPerson}</td>
                <td className="px-3 py-2">{l.toPerson}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(l.amount))}</td>
                <td className="px-3 py-2">{l.branch?.name ?? "-"}</td>
                <td className="px-3 py-2">
                  {l.isSettled ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Lunas</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Belum</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {!l.isSettled && (
                    <form
                      action={async () => {
                        "use server";
                        await markLoanSettled(l.id);
                      }}
                    >
                      <button className="text-xs text-neutral-600 hover:underline">Tandai Lunas</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
