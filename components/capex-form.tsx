"use client";

import { useActionState } from "react";
import { createCapexEntry, type ModalFormState } from "@/actions/modal";

type Branch = { id: string; name: string };
const CATEGORIES = ["RENOVASI", "SEWA", "PERLENGKAPAN", "LAINNYA"] as const;

const initialState: ModalFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function CapexForm({ branches }: { branches: Branch[] }) {
  const [state, formAction, pending] = useActionState(createCapexEntry, initialState);

  return (
    <form action={formAction} className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 bg-white p-4">
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
        <label className={labelClass}>Tanggal</label>
        <input type="date" name="date" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Kategori</label>
        <select name="category" className={inputClass} defaultValue="LAINNYA">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className={labelClass}>Keterangan</label>
        <input name="keterangan" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Qty</label>
        <input type="number" name="qty" defaultValue={1} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Harga Satuan</label>
        <input type="number" name="hargaSatuan" required className={inputClass} />
      </div>

      {state.error && <p className="col-span-3 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-3 w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan Modal/Capex"}
      </button>
    </form>
  );
}
