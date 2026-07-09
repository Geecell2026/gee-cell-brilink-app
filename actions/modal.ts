"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { capexEntrySchema, interPersonLoanSchema } from "@/lib/validations/modal";

export type ModalFormState = { error?: string };

export async function createCapexEntry(
  _prevState: ModalFormState,
  formData: FormData
): Promise<ModalFormState> {
  const parsed = capexEntrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  await db.capexEntry.create({
    data: {
      branchId: data.branchId,
      date: new Date(data.date),
      keterangan: data.keterangan,
      qty: data.qty,
      hargaSatuan: data.hargaSatuan,
      total: data.qty * data.hargaSatuan,
      category: data.category,
    },
  });

  revalidatePath("/modal");
  redirect("/modal");
}

export async function createInterPersonLoan(
  _prevState: ModalFormState,
  formData: FormData
): Promise<ModalFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = interPersonLoanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  await db.interPersonLoan.create({
    data: {
      date: new Date(data.date),
      fromPerson: data.fromPerson,
      toPerson: data.toPerson,
      amount: data.amount,
      keterangan: data.keterangan || null,
      branchId: data.branchId || null,
    },
  });

  revalidatePath("/modal/piutang");
  redirect("/modal/piutang");
}

export async function markLoanSettled(id: string) {
  await db.interPersonLoan.update({ where: { id }, data: { isSettled: true, settledAt: new Date() } });
  revalidatePath("/modal/piutang");
}
