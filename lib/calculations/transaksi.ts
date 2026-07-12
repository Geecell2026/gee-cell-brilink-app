import type { Prisma } from "@/lib/generated/prisma/client";

type TxLike = {
  brilinkPendapatan: Prisma.Decimal | number;
  brilinkFee: Prisma.Decimal | number;
  brilinkPengeluaran: Prisma.Decimal | number;
  lainPendapatan: Prisma.Decimal | number;
  lainPengeluaran: Prisma.Decimal | number;
  asetPendapatan: Prisma.Decimal | number;
  asetPengeluaran: Prisma.Decimal | number;
  cleoJumlah: Prisma.Decimal | number;
  cleoTipe: "PENDAPATAN" | "PENGELUARAN";
  operasional: Prisma.Decimal | number;
  gajiKasbon: Prisma.Decimal | number;
  plusMinus: Prisma.Decimal | number;
  saldoAwal: Prisma.Decimal | number;
};

// Diverifikasi terhadap sheet sumber (REKAP LAPORAN WIL EKEK) 2026-07-12 -
// brilinkPengeluaran ditambahkan setelah ditemukan kolom "Brilink Pengeluaran"
// di sheet tidak pernah termigrasi ke database sejak awal (Rp67 juta hilang
// dari total historis 10 cabang). Pv sengaja TIDAK dimasukkan sebagai
// pengeluaran - dikonfirmasi user itu Prive (ambilan pribadi Lando & partner
// cabang join), bukan biaya operasional, jadi hanya mengurangi Saldo Akhir.
//
// Cleo Member Struk: nilainya masuk Pendapatan atau Pengeluaran tergantung cleoTipe
// (Ekek jual ke cabang lain = Pendapatan bagi Ekek, cabang lain beli dari Ekek = Pengeluaran).
export function hitungTotalPendapatan(tx: TxLike) {
  return (
    Number(tx.brilinkPendapatan) +
    Number(tx.brilinkFee) +
    Number(tx.lainPendapatan) +
    Number(tx.asetPendapatan) +
    (tx.cleoTipe === "PENDAPATAN" ? Number(tx.cleoJumlah) : 0)
  );
}

export function hitungTotalPengeluaran(tx: TxLike) {
  return (
    Number(tx.brilinkPengeluaran) +
    Number(tx.lainPengeluaran) +
    Number(tx.asetPengeluaran) +
    Number(tx.operasional) +
    Number(tx.gajiKasbon) +
    (tx.cleoTipe === "PENGELUARAN" ? Number(tx.cleoJumlah) : 0)
  );
}

export function hitungSaldoAkhir(tx: TxLike) {
  return (
    Number(tx.saldoAwal) +
    hitungTotalPendapatan(tx) -
    hitungTotalPengeluaran(tx) +
    Number(tx.plusMinus)
  );
}
