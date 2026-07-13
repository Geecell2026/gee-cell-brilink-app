import "dotenv/config";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Backfill tanggalMulaiOperasi/tanggalTutupOperasi (section 6 & 20 spec periode
// operasional, 2026-07-13). Dry-run secara default - jalankan dengan --apply
// untuk benar-benar menulis ke database.
//
// Kandidat tanggalMulaiOperasi = tanggal laporan (DailyTransaction) PERTAMA per
// cabang - HANYA mengisi field yang masih null, tidak pernah menimpa tanggal
// yang sudah diisi manual sebelumnya.
//
// tanggalTutupOperasi TIDAK diinferensi otomatis untuk cabang manapun kecuali
// AB2 (Cabang "AB 2") - satu-satunya cabang yang terverifikasi berhenti
// beroperasi secara permanen (audit 2026-07-13: baris terakhir 2026-03-17
// berisi transaksi asli/brilinkPendapatan=Rp15.000, BUKAN baris 0/0 kosong -
// jadi 2026-03-17 itu sendiri adalah hari operasional TERAKHIR, bukan hari
// pertama tidak beroperasi seperti dugaan awal di spec). Cabang lain (mis.
// Permata Biru yang jarak antar-laporannya melebar) TIDAK ditutup otomatis di
// sini - penutupan permanen harus dikonfirmasi manusia lewat halaman Cabang.
const AB2_BRANCH_NAME = "AB 2";
const AB2_TANGGAL_TUTUP = "2026-03-17";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function fmt(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "-";
}

async function main() {
  const apply = process.argv.includes("--apply");

  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });
  const firstDates = await db.dailyTransaction.groupBy({ by: ["branchId"], _min: { date: true } });
  const firstDateMap = new Map(firstDates.map((f) => [f.branchId, f._min.date]));

  console.log(`Mode: ${apply ? "APPLY (menulis ke database)" : "DRY-RUN (preview saja, tidak ada perubahan)"}`);
  console.log("\n=== Kandidat tanggalMulaiOperasi (hanya mengisi field yang masih null) ===");
  console.log("Cabang".padEnd(16), "Nilai Lama".padEnd(12), "Kandidat Baru".padEnd(14), "Catatan");

  for (const b of branches) {
    const kandidat = firstDateMap.get(b.id) ?? null;
    const sudahAda = b.tanggalMulaiOperasi !== null;
    const catatan = sudahAda
      ? "sudah diisi manual, tidak ditimpa"
      : kandidat
        ? "diisi dari tanggal laporan pertama (inferred)"
        : "tidak ada data laporan sama sekali, dilewati";

    console.log(b.name.padEnd(16), fmt(b.tanggalMulaiOperasi).padEnd(12), (sudahAda ? "-" : fmt(kandidat)).padEnd(14), catatan);

    if (apply && !sudahAda && kandidat) {
      await db.branch.update({ where: { id: b.id }, data: { tanggalMulaiOperasi: kandidat } });
    }
  }

  console.log("\n=== tanggalTutupOperasi: hanya AB2 (terverifikasi tutup permanen) ===");
  const ab2 = branches.find((b) => b.name === AB2_BRANCH_NAME);
  if (!ab2) {
    console.log(`Cabang "${AB2_BRANCH_NAME}" tidak ditemukan - dilewati.`);
  } else if (ab2.tanggalTutupOperasi) {
    console.log(`AB2 sudah punya tanggalTutupOperasi=${fmt(ab2.tanggalTutupOperasi)} - tidak ditimpa.`);
  } else {
    console.log(`AB2: tanggalTutupOperasi lama=${fmt(ab2.tanggalTutupOperasi)} -> baru=${AB2_TANGGAL_TUTUP}`);
    if (apply) {
      await db.branch.update({
        where: { id: ab2.id },
        data: { tanggalTutupOperasi: new Date(`${AB2_TANGGAL_TUTUP}T00:00:00Z`) },
      });
    }
  }

  if (!apply) {
    console.log("\nIni baru preview. Jalankan lagi dengan --apply untuk menyimpan perubahan.");
  } else {
    console.log("\nSelesai - perubahan sudah disimpan.");
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    return db.$disconnect();
  });
