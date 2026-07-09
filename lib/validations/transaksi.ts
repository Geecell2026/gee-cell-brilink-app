import { z } from "zod";

const decimalField = z.coerce.number().default(0);

export const tellerRowSchema = z.object({
  tellerName: z.string().min(1),
  tf: decimalField,
  eWallet: decimalField,
  itTt: decimalField,
});

export const biayaRowSchema = z.object({
  categoryId: z.string().optional().default(""),
  keterangan: z.string().optional().default(""),
  jumlah: decimalField,
});

export const dailyTransactionSchema = z.object({
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),

  brilinkPendapatan: decimalField,
  brilinkFee: decimalField,

  lainKeterangan: z.string().optional(),
  lainPendapatan: decimalField,
  lainPengeluaran: decimalField,

  asetKeterangan: z.string().optional(),
  asetPendapatan: decimalField,
  asetPengeluaran: decimalField,

  cleoJumlah: decimalField,
  cleoTipe: z.enum(["PENDAPATAN", "PENGELUARAN"]).default("PENDAPATAN"),
  keteranganUmum: z.string().optional(),

  operasional: decimalField,
  pv: decimalField,
  gajiKasbon: decimalField,
  plusMinus: decimalField,

  saldoAwal: decimalField,

  tellerRows: z.array(tellerRowSchema).default([]),
  biayaRows: z.array(biayaRowSchema).default([]),
});

export type DailyTransactionInput = z.infer<typeof dailyTransactionSchema>;
