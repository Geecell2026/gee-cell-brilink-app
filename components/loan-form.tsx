"use client";

import { useActionState } from "react";
import { createInterPersonLoan, type ModalFormState } from "@/actions/modal";

type Branch = { id: string; name: string };

const initialState: ModalFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function LoanForm({ branches }: { branches: Branch[] }) {
  const [state, formAction, pending] = useActionState(createInterPersonLoan, initialState);

  return (
    <form action={formAction} className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-1">
        <label className={labelClass}>Dari</label>
        <input name="fromPerson" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Ke</label>
        <input name="toPerson" required className={inputClass} />
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
        <label className={labelClass}>Cabang Terkait (opsional)</label>
        <select name="branchId" className={inputClass} defaultValue="">
          <option value="">-</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Keterangan</label>
        <input name="keterangan" className={inputClass} />
      </div>

      {state.error && <p className="col-span-3 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-3 w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan Piutang"}
      </button>
    </form>
  );
}
