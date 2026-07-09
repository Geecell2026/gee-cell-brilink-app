"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { itemSchema, purchaseSchema, distributionSchema } from "@/lib/validations/stock";
import { hitungHppTertimbang, hitungStockLevels } from "@/lib/calculations/stock";

export type StockFormState = { error?: string };

export async function createItem(
  _prevState: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.item.create({ data: parsed.data });
  revalidatePath("/stock/item");
  redirect("/stock/item");
}

export async function createPurchase(
  _prevState: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;
  const unitCost = data.hargaBeli / data.pcs;

  await db.stockMovement.create({
    data: {
      itemId: data.itemId,
      branchId: null,
      date: new Date(data.date),
      direction: "IN",
      type: "PEMBELIAN",
      qty: data.pcs,
      unitCost,
      keterangan: data.keterangan || null,
    },
  });

  const hppBaru = await hitungHppTertimbang(data.itemId);
  await db.item.update({ where: { id: data.itemId }, data: { hpp: hppBaru } });

  revalidatePath("/stock/pembelian");
  revalidatePath("/stock");
  redirect("/stock/pembelian");
}

export async function createDistribution(
  _prevState: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const parsed = distributionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const data = parsed.data;

  const levels = await hitungStockLevels();
  const stockGudang = levels.find((l) => l.itemId === data.itemId && l.branchId === null)?.qty ?? 0;
  if (stockGudang < data.qty) {
    return { error: `Stock di Gudang tidak cukup (tersedia ${stockGudang})` };
  }

  const pairId = randomUUID();
  await db.$transaction([
    db.stockMovement.create({
      data: {
        itemId: data.itemId,
        branchId: null,
        date: new Date(data.date),
        direction: "OUT",
        type: "DISTRIBUSI",
        qty: data.qty,
        keterangan: data.keterangan || null,
        pairId,
      },
    }),
    db.stockMovement.create({
      data: {
        itemId: data.itemId,
        branchId: data.toBranchId,
        date: new Date(data.date),
        direction: "IN",
        type: "DISTRIBUSI",
        qty: data.qty,
        keterangan: data.keterangan || null,
        pairId,
      },
    }),
  ]);

  revalidatePath("/stock/distribusi");
  revalidatePath("/stock");
  redirect("/stock/distribusi");
}
