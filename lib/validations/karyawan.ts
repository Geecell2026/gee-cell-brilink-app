import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  position: z.string().optional(),
  gajiPokok: z.coerce.number().nonnegative("Gaji pokok tidak boleh negatif"),
  tanggalMasuk: z.string().min(1, "Tanggal masuk wajib diisi"),
});

export const attendanceStatusEnum = z.enum(["HADIR", "CUTI", "SAKIT", "ALPHA", "LIBUR"]);

export const attendanceEntrySchema = z.object({
  employeeId: z.string().min(1),
  status: attendanceStatusEnum,
});

export const attendanceBatchSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  entries: z.array(attendanceEntrySchema),
});

export const kasbonSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  keterangan: z.string().optional(),
});
