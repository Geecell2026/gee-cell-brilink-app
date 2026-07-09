import type { Prisma } from "@/lib/generated/prisma/client";

type TxLike = {
  brilinkPendapatan: Prisma.Decimal | number;
  brilinkFee: Prisma.Decimal | number;
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

// Catatan: formula total pendapatan/pengeluaran ini estimasi awal berdasarkan
// pola sheet lama. Perlu diverifikasi ulang dengan user saat data riil mulai dipakai.
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
