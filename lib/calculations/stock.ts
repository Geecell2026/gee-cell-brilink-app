import { db } from "@/lib/db";

export async function hitungHppTertimbang(itemId: string): Promise<number> {
  const purchases = await db.stockMovement.findMany({
    where: { itemId, type: "PEMBELIAN" },
    select: { qty: true, unitCost: true },
  });

  let totalQty = 0;
  let totalCost = 0;
  for (const p of purchases) {
    totalQty += p.qty;
    totalCost += p.qty * Number(p.unitCost ?? 0);
  }

  return totalQty > 0 ? totalCost / totalQty : 0;
}

export type StockLevel = { itemId: string; branchId: string | null; qty: number };

export async function hitungStockLevels(): Promise<StockLevel[]> {
  const grouped = await db.stockMovement.groupBy({
    by: ["itemId", "branchId", "direction"],
    _sum: { qty: true },
  });

  const levels = new Map<string, StockLevel>();
  for (const row of grouped) {
    const key = `${row.itemId}::${row.branchId ?? "GUDANG"}`;
    const current = levels.get(key) ?? { itemId: row.itemId, branchId: row.branchId, qty: 0 };
    const qty = row._sum.qty ?? 0;
    current.qty += row.direction === "IN" ? qty : -qty;
    levels.set(key, current);
  }

  return Array.from(levels.values());
}
