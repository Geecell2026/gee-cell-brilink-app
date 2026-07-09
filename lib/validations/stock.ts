import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "Nama item wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  unit: z.string().min(1).default("pcs"),
});

export const purchaseSchema = z.object({
  itemId: z.string().min(1, "Item wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  keterangan: z.string().optional(),
  pcs: z.coerce.number().int().positive("Jumlah harus lebih dari 0"),
  hargaBeli: z.coerce.number().positive("Harga beli harus lebih dari 0"),
});

export const distributionSchema = z.object({
  itemId: z.string().min(1, "Item wajib dipilih"),
  toBranchId: z.string().min(1, "Cabang tujuan wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  qty: z.coerce.number().int().positive("Jumlah harus lebih dari 0"),
  keterangan: z.string().optional(),
});
