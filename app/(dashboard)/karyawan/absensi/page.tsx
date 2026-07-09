import { db } from "@/lib/db";
import { AbsensiForm } from "@/components/absensi-form";
import { JATAH_CUTI_PER_BULAN } from "@/lib/calculations/kalender";

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const date =
    params.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: { branch: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const existing = await db.attendance.findMany({
    where: { date: new Date(date) },
  });
  const initialStatuses = Object.fromEntries(existing.map((a) => [a.employeeId, a.status]));

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Absensi Harian</h1>
        <p className="text-sm text-neutral-500">
          Jatah cuti {JATAH_CUTI_PER_BULAN} hari/bulan, booking 1-2 minggu sebelumnya
        </p>
      </div>

      <form className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Pilih Tanggal
        </button>
      </form>

      <AbsensiForm
        date={date}
        employees={employees.map((e) => ({ id: e.id, name: e.name, branchName: e.branch.name }))}
        initialStatuses={initialStatuses}
      />
    </div>
  );
}
