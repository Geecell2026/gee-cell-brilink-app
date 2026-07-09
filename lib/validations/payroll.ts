import { z } from "zod";

export const branchSalaryClaimSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  payingBranchId: z.string().min(1, "Cabang pembayar wajib dipilih"),
  owingBranchId: z.string().min(1, "Cabang penanggung wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  keterangan: z.string().optional(),
});
