import type { InsightResult } from "@/lib/insights/types";
import { InsightItem } from "./insight-item";

// Dipakai Dashboard - daftar ringkas, tanpa filter/grouping (itu di
// InsightExplorer, khusus Ringkasan Owner).
export function InsightList({ insights }: { insights: InsightResult[] }) {
  if (insights.length === 0) {
    return <p className="text-sm text-neutral-500">Belum cukup data untuk menghasilkan insight.</p>;
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight) => (
        <InsightItem key={insight.id} insight={insight} />
      ))}
    </ul>
  );
}
