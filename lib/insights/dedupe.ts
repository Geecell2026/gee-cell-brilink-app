import type { InsightResult } from "./types";

// Dedup berdasarkan stable id (ruleId+entityId+periodStart+periodEnd, dibangun
// tiap rule sendiri) - bukan ID acak, supaya urutan/isi insight tidak berubah-
// ubah antar render untuk data yang sama. Kalau dua rule KEBETULAN membuat id
// yang identik persis (jarang, hanya bisa terjadi dalam rule yang sama), yang
// dipertahankan adalah yang muncul pertama.
export function dedupeInsights(results: InsightResult[]): InsightResult[] {
  const seen = new Set<string>();
  const out: InsightResult[] = [];
  for (const r of results) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}
