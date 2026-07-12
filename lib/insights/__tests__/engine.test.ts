import { describe, expect, it } from "vitest";
import { generateInsights } from "../engine";
import { dedupeInsights } from "../dedupe";
import { insightRuleRegistry } from "../registry";
import { buatBranch, buatContext, buatPoints } from "./test-helpers";
import type { InsightResult } from "../types";

function buatInsight(overrides: Partial<InsightResult> & { id: string }): InsightResult {
  return {
    ruleId: "test-rule",
    ruleVersion: "1.0.0",
    category: "anomaly",
    severity: "info",
    priorityScore: 0,
    title: "t",
    message: "m",
    entityType: "branch",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-12",
    sourceModules: [],
    generatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("dedupeInsights", () => {
  it("insight dengan id sama persis digabung jadi satu (yang pertama dipertahankan)", () => {
    const a = buatInsight({ id: "same", title: "A" });
    const b = buatInsight({ id: "same", title: "B" });
    const c = buatInsight({ id: "beda" });
    expect(dedupeInsights([a, b, c])).toEqual([a, c]);
  });
});

describe("generateInsights (engine, pakai registry sungguhan)", () => {
  it("mengurutkan berdasarkan severity dulu (critical di atas), lalu priorityScore", () => {
    // Konstruksi context yang memicu beberapa rule sekaligus dengan severity berbeda.
    const zeroPoints = buatPoints("Ekek", [
      { date: "2026-07-01", total: 50 },
      { date: "2026-07-02", total: 0 },
      { date: "2026-07-03", total: 0 },
      { date: "2026-07-04", total: 0 },
    ]);
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPoints: zeroPoints,
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
          currentPendapatan: 40_000_000,
          currentBiaya: 8_000_000,
          previousPendapatan: 40_000_000,
          previousBiaya: 8_000_000,
        }),
      ],
    });
    const hasil = generateInsights(context);
    for (let i = 1; i < hasil.length; i++) {
      const order = ["critical", "warning", "attention", "positive", "info"];
      expect(order.indexOf(hasil[i - 1].severity)).toBeLessThanOrEqual(order.indexOf(hasil[i].severity));
    }
  });

  it("maxResults membatasi jumlah hasil (dipakai Dashboard) - Ringkasan Owner (tanpa maxResults) dapat semua", () => {
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPoints: buatPoints("Ekek", [
            { date: "2026-07-01", total: 0 },
            { date: "2026-07-02", total: 0 },
            { date: "2026-07-03", total: 0 },
          ]),
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
        }),
      ],
    });
    const dibatasi = generateInsights(context, { maxResults: 1 });
    const semua = generateInsights(context);
    expect(dibatasi.length).toBeLessThanOrEqual(1);
    expect(semua.length).toBeGreaterThanOrEqual(dibatasi.length);
  });

  it("tidak pernah menghasilkan NaN/Infinity/undefined pada field manapun, bahkan untuk data minim", () => {
    const context = buatContext({ branches: [buatBranch({ branchId: "ck", branchName: "CK" })] });
    const hasil = generateInsights(context);
    for (const h of hasil) {
      expect(Number.isFinite(h.priorityScore)).toBe(true);
      if (h.metricValue !== null && h.metricValue !== undefined) expect(Number.isFinite(h.metricValue)).toBe(true);
      expect(h.title).not.toContain("undefined");
      expect(h.message).not.toContain("undefined");
      expect(h.message).not.toContain("NaN");
      expect(h.message).not.toContain("Infinity");
    }
  });

  it("context tanpa cabang sama sekali aman (tidak error, hasil kosong)", () => {
    const context = buatContext({ branches: [] });
    expect(() => generateInsights(context)).not.toThrow();
    expect(generateInsights(context)).toEqual([]);
  });

  it("setiap rule di registry punya ruleId dan ruleVersion, dan hanya rule enabled yang terdaftar aktif", () => {
    for (const rule of insightRuleRegistry) {
      expect(rule.ruleId).toBeTruthy();
      expect(rule.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
    expect(insightRuleRegistry.every((r) => r.enabled)).toBe(true);
  });

  it("setiap insight yang dihasilkan membawa ruleId+ruleVersion (traceability)", () => {
    const context = buatContext({
      branches: [
        buatBranch({
          branchId: "ekek",
          branchName: "Ekek",
          currentPoints: buatPoints("Ekek", [
            { date: "2026-07-01", total: 0 },
            { date: "2026-07-02", total: 0 },
            { date: "2026-07-03", total: 0 },
          ]),
          firstReportDate: new Date("2026-06-01T00:00:00Z"),
        }),
      ],
    });
    const hasil = generateInsights(context);
    expect(hasil.length).toBeGreaterThan(0);
    for (const h of hasil) {
      expect(h.ruleId).toBeTruthy();
      expect(h.ruleVersion).toBeTruthy();
      expect(h.sourceModules.length).toBeGreaterThan(0);
    }
  });
});
