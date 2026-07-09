"use client";

import { useActionState } from "react";
import { createDistribution, type StockFormState } from "@/actions/stock";

type Item = { id: string; name: string };
type Branch = { id: string; name: string };

const initialState: StockFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function DistribusiForm({ items, branches }: { items: Item[]; branches: Branch[] }) {
  const [state, formAction, pending] = useActionState(createDistribution, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClass}>Item</label>
          <select name="itemId" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Pilih item
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Cabang Tujuan</label>
          <select name="toBranchId" required className={inputClass} defaultValue="">
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
          <label className={labelClass}>Tanggal</label>
          <input type="date" name="date" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Jumlah</label>
          <input type="number" name="qty" required className={inputClass} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className={labelClass}>Keterangan</label>
          <input name="keterangan" className={inputClass} />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan Distribusi"}
      </button>
    </form>
  );
}
