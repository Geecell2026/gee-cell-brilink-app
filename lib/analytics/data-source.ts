import { db } from "@/lib/db";
import type { RawTx } from "./aggregation";

// Sumber data analitik = data yang sudah diinput lewat Transaksi Harian (bukan
// upload file terpisah) - "Total Transaksi" per hari dihitung dari breakdown
// teller (TF/Transfer + E-Wallet + IT+TT/Tarik Tunai), sama seperti Dashboard.
export async function getRawTransaksiData(branchId?: string): Promise<RawTx[]> {
  const transactions = await db.dailyTransaction.findMany({
    where: branchId ? { branchId } : undefined,
    include: { branch: true, tellerBreakdown: true },
    orderBy: { date: "asc" },
  });

  return transactions.map((tx) => ({
    date: tx.date,
    branchName: tx.branch.name,
    totalTransaksi: tx.tellerBreakdown.reduce(
      (sum, t) => sum + Number(t.tf) + Number(t.eWallet) + Number(t.itTt),
      0
    ),
  }));
}
