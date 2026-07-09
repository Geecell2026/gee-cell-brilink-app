"use client";

import { useActionState } from "react";
import { generatePayrollPeriode, type PayrollActionState } from "@/actions/payroll";

const initialState: PayrollActionState = {};

export function GeneratePayrollForm({ defaultPeriode }: { defaultPeriode: string }) {
  const [state, formAction, pending] = useActionState(generatePayrollPeriode, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <input
        type="month"
        name="periode"
        defaultValue={defaultPeriode}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Menghitung..." : "Generate Payroll"}
      </button>
      {state.info && <p className="text-sm text-neutral-600">{state.info}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
