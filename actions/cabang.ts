"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { branchSchema, branchOperationalSchema } from "@/lib/validations/cabang";

export type CabangFormState = { error?: string };

// Dipanggil setiap kali data operasional cabang (tanggalMulaiOperasi/
// tanggalTutupOperasi/isActive) berubah - halaman yang mengonsumsi periode
// operasional cabang (Dashboard, Ringkasan Owner/Insight Otomatis, Cabang
// sendiri) harus langsung dapat data baru (section 17).
function revalidateOperationalConsumers() {
  revalidatePath("/cabang");
  revalidatePath("/");
  revalidatePath("/analisis");
}

export async function createBranch(
  _prevState: CabangFormState,
  formData: FormData
): Promise<CabangFormState> {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await db.branch.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return { error: "Kode cabang sudah dipakai" };
  }

  await db.branch.create({ data: parsed.data });
  revalidatePath("/cabang");
  return {};
}

export async function toggleBranchActive(id: string) {
  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) return;
  await db.branch.update({ where: { id }, data: { isActive: !branch.isActive } });
  revalidateOperationalConsumers();
}

export type BranchOperationalFormState = { error?: string; success?: boolean };

export async function updateBranchOperationalPeriod(
  _prevState: BranchOperationalFormState,
  formData: FormData
): Promise<BranchOperationalFormState> {
  const parsed = branchOperationalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { id, tanggalMulaiOperasi, tanggalTutupOperasi } = parsed.data;
  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) return { error: "Cabang tidak ditemukan" };

  await db.branch.update({
    where: { id },
    data: {
      tanggalMulaiOperasi: tanggalMulaiOperasi ? new Date(`${tanggalMulaiOperasi}T00:00:00Z`) : null,
      tanggalTutupOperasi: tanggalTutupOperasi ? new Date(`${tanggalTutupOperasi}T00:00:00Z`) : null,
    },
  });
  revalidateOperationalConsumers();
  return { success: true };
}
