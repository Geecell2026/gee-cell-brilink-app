import { insightRuleRegistry } from "./registry";
import { dedupeInsights } from "./dedupe";
import { SEVERITY_ORDER } from "./severity";
import type { InsightContext, InsightResult } from "./types";

// Engine ini SENGAJA generik - tidak ada rumus anomali/cost-ratio/kontribusi/
// kelengkapan di sini. Tanggung jawabnya cuma 4: jalankan rule yang enabled,
// dedup, urutkan, batasi jumlah. Menambah rule baru (Stock/Kasbon/Target/
// Proyeksi nanti) tidak butuh mengubah file ini sama sekali - cukup tambah
// rule baru ke registry.ts.
export function generateInsights(context: InsightContext, options?: { maxResults?: number }): InsightResult[] {
  const raw = insightRuleRegistry
    .filter((rule) => rule.enabled)
    .flatMap((rule) => rule.handler(context));

  const deduped = dedupeInsights(raw);
  const sorted = sortByPriority(deduped);

  return options?.maxResults ? sorted.slice(0, options.maxResults) : sorted;
}

function sortByPriority(results: InsightResult[]): InsightResult[] {
  return [...results].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severityDiff !== 0) return severityDiff;
    return b.priorityScore - a.priorityScore;
  });
}
