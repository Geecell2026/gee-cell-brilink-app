"use client";

import { useActionState } from "react";
import { createItem, type StockFormState } from "@/actions/stock";

const initialState: StockFormState = {};
const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "text-xs font-medium text-neutral-600";

export function ItemForm() {
  const [state, formAction, pending] = useActionState(createItem, initialState);

  return (
    <form action={formAction} className="grid grid-cols-4 items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-1">
        <label className={labelClass}>Nama Item</label>
        <input name="name" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Kategori</label>
        <input name="category" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Satuan</label>
        <input name="unit" defaultValue="pcs" className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah Item"}
      </button>
      {state.error && <p className="col-span-4 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
