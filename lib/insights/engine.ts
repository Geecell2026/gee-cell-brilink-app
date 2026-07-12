import { insightRuleRegistry } from "./registry";
import { dedupeInsights } from "./dedupe";
import { SEVERITY_ORDER } from "./severity";
import { INSIGHT_THRESHOLDS } from "./thresholds";
import type { InsightContext, InsightResult } from "./types";

// Engine ini SENGAJA generik - tidak ada rumus anomali/cost-ratio/kontribusi/
// kelengkapan di sini. Tanggung jawabnya: jalankan rule yang enabled, dedup,
// urutkan, terapkan category budget (HANYA saat maxResults dipakai - dipakai
// Dashboard), lalu batasi jumlah. Menambah rule baru (Stock/Kasbon/Target/
// Proyeksi nanti) tidak butuh mengubah file ini sama sekali - cukup tambah
// rule baru ke registry.ts.
export function generateInsights(context: InsightContext, options?: { maxResults?: number }): InsightResult[] {
  const raw = insightRuleRegistry
    .filter((rule) => rule.enabled)
    .flatMap((rule) => rule.handler(context));

  const deduped = dedupeInsights(raw);
  const sorted = sortByPriority(deduped);

  if (!options?.maxResults) return sorted;

  // Category budget cuma diterapkan saat ada batas jumlah (Dashboard) - Ringkasan
  // Owner (tanpa maxResults) selalu dapat daftar lengkap tanpa budget kategori,
  // karena sudah punya filter/grouping sendiri di sisi UI.
  const budgeted = applyCategoryBudget(sorted);
  return budgeted.slice(0, options.maxResults);
}

function sortByPriority(results: InsightResult[]): InsightResult[] {
  return [...results].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severityDiff !== 0) return severityDiff;
    return b.priorityScore - a.priorityScore;
  });
}

// Menjaga satu kategori tidak menghabiskan seluruh slot Dashboard. Input HARUS
// sudah terurut prioritas (severity dulu) - budget diisi secara greedy sesuai
// urutan itu, jadi insight critical dari kategori manapun otomatis "menang"
// atas insight severity rendah dari kategori lain yang budgetnya sudah penuh.
// Generik murni: tidak tahu apa itu "anomaly"/"cost_ratio", cuma baca string
// kategori dan angka budget dari konfigurasi.
function applyCategoryBudget(sorted: InsightResult[]): InsightResult[] {
  const budget = INSIGHT_THRESHOLDS.dashboardCategoryBudget;
  const defaultBudget = INSIGHT_THRESHOLDS.defaultCategoryBudget;
  const positiveBudget = INSIGHT_THRESHOLDS.dashboardPositiveSeverityBudget;

  const usedPerCategory = new Map<string, number>();
  let usedPositive = 0;
  const result: InsightResult[] = [];

  for (const insight of sorted) {
    const catBudget = budget[insight.category] ?? defaultBudget;
    const catUsed = usedPerCategory.get(insight.category) ?? 0;
    if (catUsed >= catBudget) continue;
    if (insight.severity === "positive" && usedPositive >= positiveBudget) continue;

    result.push(insight);
    usedPerCategory.set(insight.category, catUsed + 1);
    if (insight.severity === "positive") usedPositive++;
  }

  return result;
}
