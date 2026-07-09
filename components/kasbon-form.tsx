"use client";

import { useActionState } from "react";
import { createKasbon, type KaryawanFormState } from "@/actions/karyawan";

type Employee = { id: string; name: string };

const initialState: KaryawanFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function KasbonForm({ employees }: { employees: Employee[] }) {
  const [state, formAction, pending] = useActionState(createKasbon, initialState);

  return (
    <form action={formAction} className="grid grid-cols-4 gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-1">
        <label className={labelClass}>Karyawan</label>
        <select name="employeeId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Pilih karyawan
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Tanggal</label>
        <input type="date" name="date" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Jumlah</label>
        <input type="number" name="amount" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Keterangan</label>
        <input name="keterangan" className={inputClass} />
      </div>

      {state.error && <p className="col-span-4 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-4 w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan Kasbon"}
      </button>
    </form>
  );
}
