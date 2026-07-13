import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Nama cabang wajib diisi"),
  code: z
    .string()
    .min(1, "Kode cabang wajib diisi")
    .regex(/^[A-Z0-9_]+$/, "Kode hanya boleh huruf besar, angka, underscore"),
});

// tanggalMulaiOperasi/tanggalTutupOperasi kosong = null (belum diketahui/belum
// tutup) - lihat lib/calculations/operational-period.ts untuk semantik lengkap.
export const branchOperationalSchema = z
  .object({
    id: z.string().min(1),
    tanggalMulaiOperasi: z.string().optional(),
    tanggalTutupOperasi: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.tanggalMulaiOperasi || !data.tanggalTutupOperasi) return true;
      return new Date(`${data.tanggalTutupOperasi}T00:00:00Z`) >= new Date(`${data.tanggalMulaiOperasi}T00:00:00Z`);
    },
    { message: "Tanggal tutup operasi tidak boleh lebih kecil dari tanggal mulai operasi", path: ["tanggalTutupOperasi"] }
  );
