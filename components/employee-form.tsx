"use client";

import { useActionState } from "react";
import { createEmployee, type KaryawanFormState } from "@/actions/karyawan";

type Branch = { id: string; name: string };

const initialState: KaryawanFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function EmployeeForm({ branches }: { branches: Branch[] }) {
  const [state, formAction, pending] = useActionState(createEmployee, initialState);

  return (
    <form action={formAction} className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-1">
        <label className={labelClass}>Nama</label>
        <input name="name" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Cabang</label>
        <select name="branchId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Pilih cabang
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Jabatan</label>
        <input name="position" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Gaji Pokok</label>
        <input type="number" name="gajiPokok" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Tanggal Masuk</label>
        <input type="date" name="tanggalMasuk" required className={inputClass} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : "Tambah Karyawan"}
        </button>
      </div>
      {state.error && <p className="col-span-3 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
