import { describe, expect, it } from "vitest";
import { generateBranchAnomalyInsights } from "../rules/branch-anomaly";
import { generateDataCompletenessInsights } from "../rules/data-completeness";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";

// Matriks C.5 & F (kasus CK) - CK punya laporan (record ADA) dengan total 0 di
// beberapa hari dalam periode aktif. Ini HARUS diperlakukan sebagai submitted
// report (bukan missing report), dan boleh dievaluasi Deteksi Anomali sesuai
// threshold biasa (bukan otomatis "missing" ataupun otomatis "critical" tanpa bukti).
describe("Skenario CK - record 0/0 diperlakukan sebagai submitted report yang bisa jadi anomali", () => {
  it("record 0/0 dalam periode aktif dihitung SubmittedReportDays penuh, bukan MissingDays", () => {
    const points = buatPoints("CK", [
      { date: "2026-07-01", total: 12 },
      { date: "2026-07-02", total: 10 },
      { date: "2026-07-03", total: 0 },
      { date: "2026-07-04", total: 0 },
      { date: "2026-07-05", total: 0 },
      { date: "2026-07-06", total: 11 },
    ]);
    const branch = buatBranch({
      branchId: "ck",
      branchName: "CK",
      tanggalMulaiOperasi: new Date("2026-06-01T00:00:00Z"),
      firstReportDate: new Date("2026-06-01T00:00:00Z"),
      currentPoints: points,
    });
    // Periode filter dipersempit ke 1-6 Jul supaya expectedDays = submittedDays = 6 persis.
    const context = buatContext({
      branches: [branch],
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-07-07T00:00:00Z"),
      today: new Date("2026-07-06T00:00:00Z"),
    });

    const kelengkapan = generateDataCompletenessInsights(context);
    // Semua 6 hari (termasuk 3 hari 0/0) dianggap submitted -> tidak ada missing report.
    expect(kelengkapan.length).toBe(0);

    const anomali = generateBranchAnomalyInsights(context);
    const zeroInsight = anomali.find((h) => h.id.endsWith(":zero"));
    // 3 hari 0 transaksi (>= threshold critical=3) - boleh dievaluasi sebagai anomali,
    // TIDAK disuppress hanya karena nilainya nol.
    expect(zeroInsight).toBeDefined();
    expect(zeroInsight!.severity).toBe("critical");
    expect(zeroInsight!.entityName).toBe("CK");
  });
});
