"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { employeeSchema, attendanceBatchSchema, kasbonSchema } from "@/lib/validations/karyawan";
import { JATAH_CUTI_PER_BULAN } from "@/lib/calculations/kalender";

export type KaryawanFormState = { error?: string; info?: string };

export async function createEmployee(
  _prevState: KaryawanFormState,
  formData: FormData
): Promise<KaryawanFormState> {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  await db.employee.create({
    data: {
      name: data.name,
      branchId: data.branchId,
      position: data.position || null,
      gajiPokok: data.gajiPokok,
      tanggalMasuk: new Date(data.tanggalMasuk),
    },
  });

  revalidatePath("/karyawan");
  redirect("/karyawan");
}

export async function saveAttendanceBatch(
  _prevState: KaryawanFormState,
  formData: FormData
): Promise<KaryawanFormState> {
  const date = formData.get("date");
  const entriesRaw = formData.get("entriesJson");

  let entries: unknown[] = [];
  if (typeof entriesRaw === "string") {
    try {
      entries = JSON.parse(entriesRaw);
    } catch {
      return { error: "Data absensi tidak valid" };
    }
  }

  const parsed = attendanceBatchSchema.safeParse({ date, entries });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  const targetDate = new Date(data.date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const warnings: string[] = [];

  for (const entry of data.entries) {
    if (entry.status === "CUTI") {
      const existingCutiCount = await db.attendance.count({
        where: {
          employeeId: entry.employeeId,
          status: "CUTI",
          date: { gte: monthStart, lt: monthEnd, not: targetDate },
        },
      });
      if (existingCutiCount >= JATAH_CUTI_PER_BULAN) {
        const employee = await db.employee.findUnique({ where: { id: entry.employeeId } });
        warnings.push(`${employee?.name ?? entry.employeeId} sudah memakai ${existingCutiCount} hari cuti bulan ini (jatah ${JATAH_CUTI_PER_BULAN} hari)`);
      }
    }

    await db.attendance.upsert({
      where: { employeeId_date: { employeeId: entry.employeeId, date: targetDate } },
      update: { status: entry.status },
      create: { employeeId: entry.employeeId, date: targetDate, status: entry.status },
    });
  }

  revalidatePath("/karyawan/absensi");

  if (warnings.length > 0) {
    return { info: warnings.join("; ") };
  }
  redirect("/karyawan/absensi?date=" + data.date);
}

export async function createKasbon(
  _prevState: KaryawanFormState,
  formData: FormData
): Promise<KaryawanFormState> {
  const parsed = kasbonSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  await db.kasbon.create({
    data: {
      employeeId: data.employeeId,
      date: new Date(data.date),
      amount: data.amount,
      keterangan: data.keterangan || null,
    },
  });

  revalidatePath("/karyawan/kasbon");
  redirect("/karyawan/kasbon");
}
