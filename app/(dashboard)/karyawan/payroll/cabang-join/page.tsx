import { db } from "@/lib/db";
import { BranchClaimForm } from "@/components/branch-claim-form";
import { markClaimReimbursed } from "@/actions/payroll";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function CabangJoinPage() {
  const [employees, branches, claims] = await Promise.all([
    db.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.branchSalaryClaim.findMany({
      include: { employee: true, payingBranch: true, owingBranch: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Cabang Join (Gaji)</h1>
        <p className="text-sm text-neutral-500">Piutang gaji karyawan yang dibayar dulu lewat cabang lain</p>
      </div>

      <BranchClaimForm employees={employees} branches={branches} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Karyawan</th>
              <th className="px-3 py-2">Dibayar Oleh</th>
              <th className="px-3 py-2">Ditanggung</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  Belum ada klaim antar cabang.
                </td>
              </tr>
            )}
            {claims.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{c.date.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2">{c.employee.name}</td>
                <td className="px-3 py-2">{c.payingBranch.name}</td>
                <td className="px-3 py-2">{c.owingBranch.name}</td>
                <td className="px-3 py-2 text-right">{formatRupiah(Number(c.amount))}</td>
                <td className="px-3 py-2">
                  {c.isReimbursed ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Lunas</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Belum</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {!c.isReimbursed && (
                    <form
                      action={async () => {
                        "use server";
                        await markClaimReimbursed(c.id);
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
