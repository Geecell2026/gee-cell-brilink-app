"use client";

import { useActionState } from "react";
import { updateBranchOperationalPeriod, type BranchOperationalFormState } from "@/actions/cabang";

const initialState: BranchOperationalFormState = {};
const dateInputClass = "rounded border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none";

function toInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function BranchOperationalForm({
  branch,
}: {
  branch: { id: string; isActive: boolean; tanggalMulaiOperasi: Date | null; tanggalTutupOperasi: Date | null };
}) {
  const [state, formAction, pending] = useActionState(updateBranchOperationalPeriod, initialState);
  const perluWarning = !branch.isActive && !branch.tanggalTutupOperasi;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={branch.id} />
      <div className="space-y-0.5">
        <label className="block text-[10px] text-neutral-500" title="Tanggal pertama cabang mulai beroperasi.">
          Mulai Operasi
        </label>
        <input
          type="date"
          name="tanggalMulaiOperasi"
          defaultValue={toInputValue(branch.tanggalMulaiOperasi)}
          className={dateInputClass}
        />
      </div>
      <div className="space-y-0.5">
        <label
          className="block text-[10px] text-neutral-500"
          title="Hari terakhir cabang masih beroperasi. Kosongkan jika masih berjalan."
        >
          Tutup Operasi
        </label>
        <input
          type="date"
          name="tanggalTutupOperasi"
          defaultValue={toInputValue(branch.tanggalTutupOperasi)}
          className={dateInputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-xs text-green-600">Tersimpan.</p>}
      {perluWarning && (
        <p className="w-full text-xs text-amber-600">
          Peringatan: status Nonaktif tapi Tanggal Tutup Operasi belum diisi - histori operasional cabang ini belum
          bisa ditentukan otomatis untuk periode setelah laporan terakhirnya. Lengkapi tanggal tutup operasi.
        </p>
      )}
    </form>
  );
}
