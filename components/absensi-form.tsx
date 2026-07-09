"use client";

import { useActionState, useState } from "react";
import { saveAttendanceBatch, type KaryawanFormState } from "@/actions/karyawan";

type Employee = { id: string; name: string; branchName: string };
type Status = "HADIR" | "CUTI" | "SAKIT" | "ALPHA" | "LIBUR";

const initialState: KaryawanFormState = {};
const STATUS_OPTIONS: Status[] = ["HADIR", "CUTI", "SAKIT", "ALPHA", "LIBUR"];

export function AbsensiForm({
  date,
  employees,
  initialStatuses,
}: {
  date: string;
  employees: Employee[];
  initialStatuses: Record<string, Status>;
}) {
  const [state, formAction, pending] = useActionState(saveAttendanceBatch, initialState);
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => {
    const base: Record<string, Status> = {};
    for (const e of employees) base[e.id] = initialStatuses[e.id] ?? "HADIR";
    return base;
  });

  const entries = employees.map((e) => ({ employeeId: e.id, status: statuses[e.id] }));

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="entriesJson" value={JSON.stringify(entries)} />

      <div className="space-y-2">
        {employees.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-neutral-800">{e.name}</p>
              <p className="text-xs text-neutral-400">{e.branchName}</p>
            </div>
            <select
              value={statuses[e.id]}
              onChange={(ev) =>
                setStatuses((s) => ({ ...s, [e.id]: ev.target.value as Status }))
              }
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada karyawan aktif.</p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.info && <p className="text-sm text-amber-600">{state.info}</p>}

      <button
        type="submit"
        disabled={pending || employees.length === 0}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan Absensi"}
      </button>
    </form>
  );
}
