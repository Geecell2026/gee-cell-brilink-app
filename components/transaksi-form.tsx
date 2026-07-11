"use client";

import { useActionState, useState } from "react";
import {
  createDailyTransaction,
  updateDailyTransaction,
  type TransaksiFormState,
} from "@/actions/transaksi";
import { TransactionCurrencyInput } from "@/components/transaction-currency-input";
import { parseRupiahInput } from "@/lib/format/currency-input";

type Branch = { id: string; name: string };
type Category = { id: string; name: string };
type TellerRow = { tellerName: string; tf: string; eWallet: string; itTt: string };
type BiayaRow = { categoryId: string; keterangan: string; jumlah: string };

const JUMLAH_BARIS_BIAYA_DEFAULT = 5;

function buatBiayaRowsAwal(existing: BiayaRow[] = []): BiayaRow[] {
  const rows = [...existing];
  while (rows.length < JUMLAH_BARIS_BIAYA_DEFAULT) {
    rows.push({ categoryId: "", keterangan: "", jumlah: "0" });
  }
  return rows;
}

type InitialData = {
  branchId: string;
  branchName: string;
  date: string;
  saldoAwal: number;
  brilinkPendapatan: number;
  brilinkFee: number;
  lainKeterangan: string;
  lainPendapatan: number;
  lainPengeluaran: number;
  asetKeterangan: string;
  asetPendapatan: number;
  asetPengeluaran: number;
  cleoJumlah: number;
  cleoTipe: "PENDAPATAN" | "PENGELUARAN";
  keteranganUmum: string;
  operasional: number;
  pv: number;
  gajiKasbon: number;
  plusMinus: number;
  tellerRows: TellerRow[];
  biayaRows: BiayaRow[];
};

const initialState: TransaksiFormState = {};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";
const labelClass = "text-xs font-medium text-neutral-600";

export function TransaksiForm({
  branches,
  categories,
  transactionId,
  initialData,
}: {
  branches: Branch[];
  categories: Category[];
  transactionId?: string;
  initialData?: InitialData;
}) {
  const isEdit = Boolean(transactionId);
  const action = isEdit ? updateDailyTransaction.bind(null, transactionId!) : createDailyTransaction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tellerRows, setTellerRows] = useState<TellerRow[]>(initialData?.tellerRows ?? []);
  const [biayaRows, setBiayaRows] = useState<BiayaRow[]>(() => buatBiayaRowsAwal(initialData?.biayaRows));

  function addBiayaRow() {
    setBiayaRows((rows) => [...rows, { categoryId: "", keterangan: "", jumlah: "0" }]);
  }

  function updateBiayaRow(index: number, field: keyof BiayaRow, value: string) {
    setBiayaRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeBiayaRow(index: number) {
    setBiayaRows((rows) => rows.filter((_, i) => i !== index));
  }

  function addTellerRow() {
    setTellerRows((rows) => [...rows, { tellerName: "", tf: "0", eWallet: "0", itTt: "0" }]);
  }

  function updateTellerRow(index: number, field: keyof TellerRow, value: string) {
    setTellerRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeTellerRow(index: number) {
    setTellerRows((rows) => rows.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tellerRowsJson" value={JSON.stringify(tellerRows)} />
      <input type="hidden" name="biayaRowsJson" value={JSON.stringify(biayaRows)} />

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-1">
          <label className={labelClass}>Cabang</label>
          {isEdit ? (
            <input value={initialData!.branchName} disabled className={inputClass} />
          ) : (
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
          )}
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Tanggal</label>
          <input
            type="date"
            name={isEdit ? undefined : "date"}
            required
            disabled={isEdit}
            defaultValue={initialData?.date}
            className={inputClass}
          />
        </div>
        <TransactionCurrencyInput label="Saldo Awal" name="saldoAwal" defaultValue={initialData?.saldoAwal} />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Brilink/Atm Mini</h2>
        <div className="grid grid-cols-2 gap-4">
          <TransactionCurrencyInput label="Pendapatan Adm" name="brilinkPendapatan" defaultValue={initialData?.brilinkPendapatan} />
          <TransactionCurrencyInput label="Fee" name="brilinkFee" defaultValue={initialData?.brilinkFee} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Lain-lain</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Keterangan</label>
            <input name="lainKeterangan" defaultValue={initialData?.lainKeterangan} className={inputClass} />
          </div>
          <TransactionCurrencyInput label="Pendapatan" name="lainPendapatan" defaultValue={initialData?.lainPendapatan} />
          <TransactionCurrencyInput label="Pengeluaran" name="lainPengeluaran" defaultValue={initialData?.lainPengeluaran} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Aset</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Keterangan</label>
            <input name="asetKeterangan" defaultValue={initialData?.asetKeterangan} className={inputClass} />
          </div>
          <TransactionCurrencyInput label="Pendapatan" name="asetPendapatan" defaultValue={initialData?.asetPendapatan} />
          <TransactionCurrencyInput label="Pengeluaran" name="asetPengeluaran" defaultValue={initialData?.asetPengeluaran} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Lainnya</h2>
        <div className="grid grid-cols-3 gap-4">
          <TransactionCurrencyInput label="Jumlah Cleo Member Struk" name="cleoJumlah" defaultValue={initialData?.cleoJumlah} />
          <div className="space-y-1">
            <label className={labelClass}>Tipe Cleo Member Struk</label>
            <select name="cleoTipe" defaultValue={initialData?.cleoTipe ?? "PENDAPATAN"} className={inputClass}>
              <option value="PENDAPATAN">Pendapatan (Ekek jual ke cabang)</option>
              <option value="PENGELUARAN">Pengeluaran (cabang beli dari Ekek)</option>
            </select>
          </div>
          <TransactionCurrencyInput label="Operasional" name="operasional" defaultValue={initialData?.operasional} />
          <TransactionCurrencyInput label="PV" name="pv" defaultValue={initialData?.pv} />
          <TransactionCurrencyInput label="Gaji/Kasbon" name="gajiKasbon" defaultValue={initialData?.gajiKasbon} />
          <TransactionCurrencyInput label="Plus Minus" name="plusMinus" defaultValue={initialData?.plusMinus} allowNegative />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Keterangan Umum</label>
          <textarea name="keteranganUmum" rows={2} defaultValue={initialData?.keteranganUmum} className={inputClass} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Biaya</h2>
          <button
            type="button"
            onClick={addBiayaRow}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            + Tambah Baris
          </button>
        </div>

        {biayaRows.map((row, i) => (
          <div key={i} className="grid grid-cols-4 items-end gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Jenis Biaya</label>
              <select
                value={row.categoryId}
                onChange={(e) => updateBiayaRow(i, "categoryId", e.target.value)}
                className={inputClass}
              >
                <option value="">-</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Keterangan</label>
              <input
                className={inputClass}
                value={row.keterangan}
                onChange={(e) => updateBiayaRow(i, "keterangan", e.target.value)}
              />
            </div>
            <TransactionCurrencyInput
              label="Jumlah"
              value={row.jumlah === "" ? null : parseRupiahInput(row.jumlah, false)}
              onChange={(value) => updateBiayaRow(i, "jumlah", value === null ? "" : String(value))}
            />
            <button
              type="button"
              onClick={() => removeBiayaRow(i)}
              className="h-fit rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              Hapus Baris
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Breakdown Total Transaksi per Teller</h2>
          <button
            type="button"
            onClick={addTellerRow}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            + Tambah Teller
          </button>
        </div>

        {tellerRows.length === 0 && (
          <p className="text-xs text-neutral-400">Belum ada baris teller.</p>
        )}

        {tellerRows.map((row, i) => (
          <div key={i} className="grid grid-cols-5 items-end gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Nama Teller</label>
              <input
                className={inputClass}
                value={row.tellerName}
                onChange={(e) => updateTellerRow(i, "tellerName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>TF</label>
              <input
                type="number"
                className={inputClass}
                value={row.tf}
                onChange={(e) => updateTellerRow(i, "tf", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>E-Wallet</label>
              <input
                type="number"
                className={inputClass}
                value={row.eWallet}
                onChange={(e) => updateTellerRow(i, "eWallet", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>IT+TT</label>
              <input
                type="number"
                className={inputClass}
                value={row.itTt}
                onChange={(e) => updateTellerRow(i, "itTt", e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeTellerRow(i)}
              className="h-fit rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              Hapus
            </button>
          </div>
        ))}
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
      </button>
    </form>
  );
}
