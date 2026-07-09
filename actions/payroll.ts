"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hitungDraftPayroll } from "@/lib/calculations/payroll";
import { branchSalaryClaimSchema } from "@/lib/validations/payroll";

export type PayrollActionState = { error?: string; info?: string };

export async function generatePayrollPeriode(
  _prevState: PayrollActionState,
  formData: FormData
): Promise<PayrollActionState> {
  const periode = formData.get("periode");
  if (typeof periode !== "string" || !periode) {
    return { error: "Periode wajib dipilih" };
  }
  const [yearStr, monthStr] = periode.split("-");
  const periodYear = Number(yearStr);
  const periodMonth = Number(monthStr);

  const employees = await db.employee.findMany({ where: { isActive: true }, select: { id: true } });

  let count = 0;
  for (const emp of employees) {
    const draft = await hitungDraftPayroll(emp.id, periodYear, periodMonth);
    if (!draft) continue;

    await db.payroll.upsert({
      where: { employeeId_periodYear_periodMonth: { employeeId: emp.id, periodYear, periodMonth } },
      update: {
        gajiPokokSnapshot: draft.gajiPokokSnapshot,
        hariEfektifKerja: draft.hariEfektifKerja,
        totalMasuk: draft.totalMasuk,
        hariLembur: draft.hariLembur,
        gajiPerHari: draft.gajiPerHari,
        gajiPokokProrata: draft.gajiPokokProrata,
        gajiLembur: draft.gajiLembur,
        totalKasbonDipotong: draft.totalKasbonDipotong,
        totalGajiKotor: draft.totalGajiKotor,
        sisaGaji: draft.sisaGaji,
      },
      create: {
        employeeId: emp.id,
        periodYear,
        periodMonth,
        gajiPokokSnapshot: draft.gajiPokokSnapshot,
        hariEfektifKerja: draft.hariEfektifKerja,
        totalMasuk: draft.totalMasuk,
        hariLembur: draft.hariLembur,
        gajiPerHari: draft.gajiPerHari,
        gajiPokokProrata: draft.gajiPokokProrata,
        gajiLembur: draft.gajiLembur,
        totalKasbonDipotong: draft.totalKasbonDipotong,
        totalGajiKotor: draft.totalGajiKotor,
        sisaGaji: draft.sisaGaji,
      },
    });
    count++;
  }

  revalidatePath("/karyawan/payroll");
  return { info: `Payroll ter-generate untuk ${count} karyawan (status DRAFT).` };
}

export async function markPayrollPaid(id: string) {
  await db.payroll.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  revalidatePath("/karyawan/payroll");
}

export async function createBranchSalaryClaim(
  _prevState: PayrollActionState,
  formData: FormData
): Promise<PayrollActionState> {
  const parsed = branchSalaryClaimSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  if (data.payingBranchId === data.owingBranchId) {
    return { error: "Cabang pembayar dan penanggung tidak boleh sama" };
  }

  await db.branchSalaryClaim.create({
    data: {
      employeeId: data.employeeId,
      payingBranchId: data.payingBranchId,
      owingBranchId: data.owingBranchId,
      date: new Date(data.date),
      amount: data.amount,
      keterangan: data.keterangan || null,
    },
  });

  revalidatePath("/karyawan/payroll/cabang-join");
  redirect("/karyawan/payroll/cabang-join");
}

export async function markClaimReimbursed(id: string) {
  await db.branchSalaryClaim.update({
    where: { id },
    data: { isReimbursed: true, reimbursedAt: new Date() },
  });
  revalidatePath("/karyawan/payroll/cabang-join");
}
