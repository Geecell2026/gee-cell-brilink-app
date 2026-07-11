import { db } from "@/lib/db";
import type { RawTx } from "./aggregation";

// Sumber data analitik = data yang sudah diinput lewat Transaksi Harian (bukan
// upload file terpisah) - "Total Transaksi" per hari dihitung dari breakdown
// teller (TF/Transfer + E-Wallet + IT+TT/Tarik Tunai), sama seperti Dashboard.
//
// `sejakTanggal`/`sampaiTanggal` membatasi query ke rentang ini saja - dipakai
// supaya tidak menarik seluruh riwayat sejak awal berdiri setiap kali salah
// satu dari 5 halaman Analisis Transaksi dibuka (index @@index([branchId, date])
// baru kepakai kalau ada predicate tanggal yang dikirim ke Prisma). Kalau
// salah satu/keduanya tidak diisi, tetap fetch tanpa batas ke arah itu
// (dipertahankan untuk pemanggil yang belum punya batas tanggal jelas).
export async function getRawTransaksiData(
  branchId?: string,
  sejakTanggal?: Date,
  sampaiTanggal?: Date
): Promise<RawTx[]> {
  const transactions = await db.dailyTransaction.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(sejakTanggal || sampaiTanggal
        ? {
            date: {
              ...(sejakTanggal ? { gte: sejakTanggal } : {}),
              ...(sampaiTanggal ? { lt: sampaiTanggal } : {}),
            },
          }
        : {}),
    },
    include: { branch: true, tellerBreakdown: true },
    // Tie-breaker branchId ditambahkan setelah ditemukan bug lama: untuk baris
    // bertanggal sama dari cabang berbeda (kondisi "Semua Cabang"), Postgres
    // TIDAK menjamin urutan konsisten hanya dengan orderBy tanggal saja - urutan
    // berubah tergantung bentuk WHERE clause/query plan, sehingga index-based
    // moving average (ma7/ma14) bisa menghasilkan angka berbeda antar-request
    // untuk filter yang sama. Sudah ada sebelum perubahan batas tanggal ini,
    // baru kelihatan sekarang karena bentuk query berubah.
    orderBy: [{ date: "asc" }, { branchId: "asc" }],
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
