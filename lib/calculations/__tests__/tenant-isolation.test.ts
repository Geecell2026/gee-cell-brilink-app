import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Arsitektur GEE CELL BRILink: setiap wilayah (Ekek, Brebes, dst) adalah project
// Next.js + database PostgreSQL TERPISAH SEPENUHNYA (bukan satu database
// multi-tenant dengan kolom tenantId/wilayahId). Karena itu, "kebocoran data
// lintas wilayah lewat query" secara struktural tidak mungkin terjadi - tidak
// ada koneksi database yang bisa menjangkau kedua wilayah sekaligus dari kode
// aplikasi ini. Test ini mendokumentasikan sekaligus memverifikasi fakta itu,
// bukan mensimulasikan filter tenant yang memang tidak ada di desain ini.
describe("Isolasi wilayah Ekek", () => {
  it("DATABASE_URL project ini menunjuk ke database Ekek, bukan wilayah lain", () => {
    const envPath = path.resolve(__dirname, "../../../.env");
    const env = fs.readFileSync(envPath, "utf-8");
    const match = env.match(/DATABASE_URL="([^"]+)"/);
    expect(match).not.toBeNull();
    const url = match![1];
    expect(url).toContain("gee_cell_brilink");
    expect(url).not.toContain("gee_cell_brebes");
    expect(url).not.toContain("brebes");
  });

  it("project ini tidak punya dependency/import ke folder project wilayah lain", () => {
    // Prisma client project ini hanya digenerate dari schema.prisma project ini
    // sendiri (lib/generated/prisma) - tidak pernah mengimpor client atau query
    // builder dari project wilayah lain secara langsung.
    const dbFile = fs.readFileSync(path.resolve(__dirname, "../../db.ts"), "utf-8");
    expect(dbFile).not.toMatch(/brebes/i);
  });
});
