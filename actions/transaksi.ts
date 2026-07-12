"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dailyTransactionSchema } from "@/lib/validations/transaksi";
import { hitungSaldoAkhir } from "@/lib/calculations/transaksi";

export type TransaksiFormState = { error?: string };

function parseJsonArray(formData: FormData, field: string): unknown[] {
  const raw = formData.get(field);
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Baris biaya yang kosong (belum pilih jenis biaya atau jumlah 0) diabaikan —
// form selalu tampil beberapa baris kosong sebagai template.
function filterBiayaRows(rows: { categoryId?: string; keterangan?: string; jumlah: number }[]) {
  return rows.filter((row) => row.categoryId && row.jumlah > 0);
}

export async function createDailyTransaction(
  _prevState: TransaksiFormState,
  formData: FormData
): Promise<TransaksiFormState> {
  const raw = Object.fromEntries(formData.entries());
  const tellerRows = parseJsonArray(formData, "tellerRowsJson");
  const biayaRows = parseJsonArray(formData, "biayaRowsJson");

  const parsed = dailyTransactionSchema.safeParse({ ...raw, tellerRows, biayaRows });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  const saldoAkhir = hitungSaldoAkhir(data);
  const validBiayaRows = filterBiayaRows(data.biayaRows);

  const existing = await db.dailyTransaction.findUnique({
    where: { branchId_date: { branchId: data.branchId, date: new Date(data.date) } },
  });
  if (existing) {
    return { error: "Transaksi untuk cabang & tanggal ini sudah ada. Silakan edit yang sudah ada." };
  }

  await db.$transaction([
    db.dailyTransaction.create({
      data: {
        branchId: data.branchId,
        date: new Date(data.date),
        brilinkPendapatan: data.brilinkPendapatan,
        brilinkPengeluaran: data.brilinkPengeluaran,
        lainKeterangan: data.lainKeterangan || null,
        lainPendapatan: data.lainPendapatan,
        lainPengeluaran: data.lainPengeluaran,
        asetKeterangan: data.asetKeterangan || null,
        brilinkFee: data.brilinkFee,
        asetPendapatan: data.asetPendapatan,
        asetPengeluaran: data.asetPengeluaran,
        cleoJumlah: data.cleoJumlah,
        cleoTipe: data.cleoTipe,
        keteranganUmum: data.keteranganUmum || null,
        operasional: data.operasional,
        pv: data.pv,
        gajiKasbon: data.gajiKasbon,
        plusMinus: data.plusMinus,
        saldoAwal: data.saldoAwal,
        saldoAkhir,
        tellerBreakdown: {
          create: data.tellerRows.map((row) => ({
            tellerName: row.tellerName,
            tf: row.tf,
            eWallet: row.eWallet,
            itTt: row.itTt,
          })),
        },
      },
    }),
    ...(validBiayaRows.length > 0
      ? [
          db.expenseEntry.createMany({
            data: validBiayaRows.map((row) => ({
              branchId: data.branchId,
              date: new Date(data.date),
              categoryId: row.categoryId!,
              keterangan: row.keterangan || "-",
              totalPembayaran: row.jumlah,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/transaksi");
  revalidatePath("/biaya");
  redirect("/transaksi");
}

export async function updateDailyTransaction(
  id: string,
  _prevState: TransaksiFormState,
  formData: FormData
): Promise<TransaksiFormState> {
  const raw = Object.fromEntries(formData.entries());
  const tellerRows = parseJsonArray(formData, "tellerRowsJson");
  const biayaRows = parseJsonArray(formData, "biayaRowsJson");

  const existing = await db.dailyTransaction.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Transaksi tidak ditemukan" };
  }

  // Cabang & tanggal tidak diubah lewat form edit (jadi kunci unik) — dipakai dari data lama.
  const parsed = dailyTransactionSchema.safeParse({
    ...raw,
    branchId: existing.branchId,
    date: existing.date.toISOString().slice(0, 10),
    tellerRows,
    biayaRows,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  const saldoAkhir = hitungSaldoAkhir(data);
  const validBiayaRows = filterBiayaRows(data.biayaRows);

  await db.$transaction([
    db.transactionTellerBreakdown.deleteMany({ where: { dailyTransactionId: id } }),
    db.dailyTransaction.update({
      where: { id },
      data: {
        brilinkPendapatan: data.brilinkPendapatan,
        brilinkPengeluaran: data.brilinkPengeluaran,
        lainKeterangan: data.lainKeterangan || null,
        lainPendapatan: data.lainPendapatan,
        lainPengeluaran: data.lainPengeluaran,
        asetKeterangan: data.asetKeterangan || null,
        brilinkFee: data.brilinkFee,
        asetPendapatan: data.asetPendapatan,
        asetPengeluaran: data.asetPengeluaran,
        cleoJumlah: data.cleoJumlah,
        cleoTipe: data.cleoTipe,
        keteranganUmum: data.keteranganUmum || null,
        operasional: data.operasional,
        pv: data.pv,
        gajiKasbon: data.gajiKasbon,
        plusMinus: data.plusMinus,
        saldoAwal: data.saldoAwal,
        saldoAkhir,
        tellerBreakdown: {
          create: data.tellerRows.map((row) => ({
            tellerName: row.tellerName,
            tf: row.tf,
            eWallet: row.eWallet,
            itTt: row.itTt,
          })),
        },
      },
    }),
    // Biaya untuk cabang+tanggal ini seluruhnya diinput lewat form transaksi,
    // jadi diganti total (hapus lalu buat ulang) supaya konsisten dengan baris yang ditampilkan di form.
    db.expenseEntry.deleteMany({ where: { branchId: existing.branchId, date: existing.date } }),
    ...(validBiayaRows.length > 0
      ? [
          db.expenseEntry.createMany({
            data: validBiayaRows.map((row) => ({
              branchId: existing.branchId,
              date: existing.date,
              categoryId: row.categoryId!,
              keterangan: row.keterangan || "-",
              totalPembayaran: row.jumlah,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/transaksi");
  revalidatePath("/biaya");
  redirect("/transaksi");
}

export async function deleteDailyTransaction(id: string) {
  await db.dailyTransaction.delete({ where: { id } });
  revalidatePath("/transaksi");
}
