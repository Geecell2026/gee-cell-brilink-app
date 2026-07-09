import { z } from "zod";

export const capexCategoryEnum = z.enum(["RENOVASI", "SEWA", "PERLENGKAPAN", "LAINNYA"]);

export const capexEntrySchema = z.object({
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  keterangan: z.string().min(1, "Keterangan wajib diisi"),
  qty: z.coerce.number().int().positive().default(1),
  hargaSatuan: z.coerce.number().positive("Harga satuan harus lebih dari 0"),
  category: capexCategoryEnum.default("LAINNYA"),
});

export const interPersonLoanSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  fromPerson: z.string().min(1, "Dari wajib diisi"),
  toPerson: z.string().min(1, "Ke wajib diisi"),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  keterangan: z.string().optional(),
  branchId: z.string().optional(),
});
