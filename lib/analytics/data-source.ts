import { db } from "@/lib/db";
import type { RawTx } from "./aggregation";

// Sumber data analitik = data yang sudah diinput lewat Transaksi Harian (bukan
// upload file terpisah) - "Total Transaksi" per hari dihitung dari breakdown
// teller (TF/Transfer + E-Wallet + IT+TT/Tarik Tunai), sama seperti Dashboard.
//
// `sejakTanggal` membatasi query ke tanggal ini ke atas - dipakai supaya tidak
// menarik seluruh riwayat sejak awal berdiri setiap kali salah satu dari 5
// halaman Analisis Transaksi dibuka. Kalau tidak diisi, tetap fetch semua
// (dipertahankan untuk pemanggil yang belum punya batas tanggal jelas).
export async function getRawTransaksiData(branchId?: string, sejakTanggal?: Date): Promise<RawTx[]> {
  const transactions = await db.dailyTransaction.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(sejakTanggal ? { date: { gte: sejakTanggal } } : {}),
    },
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
