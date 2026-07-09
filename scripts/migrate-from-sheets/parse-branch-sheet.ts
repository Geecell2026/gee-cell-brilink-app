import { parseRupiah, parseTanggalDDMMYYYY, forwardFillTop, findColumnBySection, findColumnByTopOnly } from "./lib";

export type ParsedRow = {
  date: Date;
  brilinkPendapatan: number;
  brilinkFee: number;
  lainKeterangan: string;
  lainPendapatan: number;
  lainPengeluaran: number;
  asetKeterangan: string;
  asetPendapatan: number;
  asetPengeluaran: number;
  cleoJumlah: number;
  keteranganUmum: string;
  operasional: number;
  pv: number;
  gajiKasbon: number;
  plusMinus: number;
  saldoAwal: number;
  saldoAkhir: number;
  brilinkPromosiLama: number;
  tellerName: string;
  tf: number;
  eWallet: number;
  itTt: number;
};

export function parseBranchSheet(rows: string[][], skipTeller: boolean): ParsedRow[] {
  const row1 = rows[0] ?? [];
  const row2 = rows[1] ?? [];
  const width = Math.max(row1.length, row2.length, 30);
  const top = forwardFillTop(row1, width);
  const sub = row2.map((c) => (c ?? "").toString().trim().toUpperCase());

  const isAset = (t: string) => t.includes("ASET");
  const isLain = (t: string) => t.includes("LAIN") || t.includes("DLL");
  const isBrilink = (t: string) => t.includes("BRILINK");
  const isTotalTrx = (t: string) => t.includes("TOTAL TRX") || t === "TELLER";

  const col = {
    tanggal: findColumnByTopOnly(top, (t) => t === "TANGGAL"),
    brilinkPend: findColumnBySection(top, sub, isBrilink, (s) => s === "PEND"),
    brilinkPromosi: findColumnBySection(top, sub, isBrilink, (s) => s === "PROMOSI"),
    lainKet: findColumnBySection(top, sub, isLain, (s) => s === "KET"),
    lainPend: findColumnBySection(top, sub, isLain, (s) => s === "PEND"),
    lainPeng: findColumnBySection(top, sub, isLain, (s) => s === "PENG"),
    asetKet: findColumnBySection(top, sub, isAset, (s) => s === "KET"),
    asetFee: findColumnBySection(top, sub, isAset, (s) => s.includes("FEE")),
    asetPend: findColumnBySection(top, sub, isAset, (s) => s === "PEND"),
    asetPeng: findColumnBySection(top, sub, isAset, (s) => s === "PENG"),
    cleo: findColumnByTopOnly(top, (t) => t.includes("CLEO")),
    keteranganUmum: findColumnByTopOnly(top, (t) => t === "KETERANGAN"),
    operasional: findColumnByTopOnly(top, (t) => t === "OPERASIONAL"),
    pv: findColumnByTopOnly(top, (t) => t === "PV"),
    gaji: findColumnByTopOnly(top, (t) => t.includes("GAJI")),
    plusMinus: findColumnByTopOnly(top, (t) => t.includes("PLUS")),
    saldoAwal: findColumnByTopOnly(top, (t) => t.includes("SALDO") && t.includes("AWAL")),
    saldoAkhir: findColumnByTopOnly(top, (t) => t.includes("SALDO") && t.includes("AKHIR")),
    tf: findColumnBySection(top, sub, isTotalTrx, (s) => s.includes("TF")),
    eWallet: findColumnBySection(top, sub, isTotalTrx, (s) => s.includes("WALLET") || s.includes("EWALET") || s.includes("PPOB")),
    itTt: findColumnBySection(top, sub, isTotalTrx, (s) => (s.includes("IT") && s.includes("TT")) || s === "TT"),
    tellerName: findColumnBySection(top, sub, isTotalTrx, (s) => s.includes("NAMA")),
  };

  const result: ParsedRow[] = [];
  for (const row of rows.slice(2)) {
    const date = parseTanggalDDMMYYYY(row[col.tanggal]);
    if (!date) continue;

    const brilinkPendapatan = parseRupiah(row[col.brilinkPend]);
    const brilinkFee = col.asetFee >= 0 ? parseRupiah(row[col.asetFee]) : 0;
    const lainPendapatan = parseRupiah(row[col.lainPend]);
    const lainPengeluaran = parseRupiah(row[col.lainPeng]);
    const asetPendapatan = parseRupiah(row[col.asetPend]);
    const asetPengeluaran = parseRupiah(row[col.asetPeng]);
    const cleoJumlah = col.cleo >= 0 ? parseRupiah(row[col.cleo]) : 0;
    const operasional = parseRupiah(row[col.operasional]);
    const pv = parseRupiah(row[col.pv]);
    const gajiKasbon = parseRupiah(row[col.gaji]);
    const plusMinus = parseRupiah(row[col.plusMinus]);
    const brilinkPromosiLama = parseRupiah(row[col.brilinkPromosi]);

    // Baris "hantu": semua field finansial 0, biasanya formula kosong yang menjalar
    // jauh ke masa depan tanpa data riil. Dilewati.
    const semuaNol =
      brilinkPendapatan === 0 &&
      brilinkFee === 0 &&
      lainPendapatan === 0 &&
      lainPengeluaran === 0 &&
      asetPendapatan === 0 &&
      asetPengeluaran === 0 &&
      cleoJumlah === 0 &&
      operasional === 0 &&
      pv === 0 &&
      gajiKasbon === 0 &&
      plusMinus === 0 &&
      brilinkPromosiLama === 0;
    if (semuaNol) continue;

    result.push({
      date,
      brilinkPendapatan,
      brilinkFee,
      lainKeterangan: col.lainKet >= 0 ? (row[col.lainKet] ?? "") : "",
      lainPendapatan,
      lainPengeluaran,
      asetKeterangan: col.asetKet >= 0 ? (row[col.asetKet] ?? "") : "",
      asetPendapatan,
      asetPengeluaran,
      cleoJumlah,
      keteranganUmum: col.keteranganUmum >= 0 ? (row[col.keteranganUmum] ?? "") : "",
      operasional,
      pv,
      gajiKasbon,
      plusMinus,
      saldoAwal: parseRupiah(row[col.saldoAwal]),
      saldoAkhir: parseRupiah(row[col.saldoAkhir]),
      brilinkPromosiLama,
      tellerName: !skipTeller && col.tellerName >= 0 ? (row[col.tellerName] ?? "").toString().trim() : "",
      tf: !skipTeller ? parseRupiah(row[col.tf]) : 0,
      eWallet: !skipTeller ? parseRupiah(row[col.eWallet]) : 0,
      itTt: !skipTeller ? parseRupiah(row[col.itTt]) : 0,
    });
  }
  return result;
}
