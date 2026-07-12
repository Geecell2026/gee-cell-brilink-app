import Link from "next/link";
import {
  AlertTriangle, Activity, Percent, ClipboardCheck, type LucideIcon,
} from "lucide-react";
import type { InsightCategory, InsightResult, InsightSeverity } from "@/lib/insights/types";

export const SEVERITY_STYLE: Record<InsightSeverity, { badge: string; label: string }> = {
  critical: { badge: "bg-red-100 text-red-700", label: "Kritis" },
  warning: { badge: "bg-amber-100 text-amber-700", label: "Peringatan" },
  attention: { badge: "bg-yellow-100 text-yellow-700", label: "Perhatian" },
  positive: { badge: "bg-green-100 text-green-700", label: "Positif" },
  info: { badge: "bg-blue-100 text-blue-700", label: "Info" },
};

export const CATEGORY_LABEL: Record<InsightCategory, string> = {
  anomaly: "Anomali",
  branch_performance: "Kontribusi Tren",
  cost_ratio: "Cost Ratio",
  data_completeness: "Kelengkapan Data",
  stock: "Stock",
  cash_advance: "Kasbon",
  target: "Target",
  projection: "Proyeksi",
};

const CATEGORY_ICON: Record<InsightCategory, LucideIcon> = {
  anomaly: AlertTriangle,
  branch_performance: Activity,
  cost_ratio: Percent,
  data_completeness: ClipboardCheck,
  stock: ClipboardCheck,
  cash_advance: ClipboardCheck,
  target: Activity,
  projection: Activity,
};

// Satu kartu insight - dipakai InsightList (Dashboard) maupun InsightExplorer
// (Ringkasan Owner) supaya tampilannya selalu identik. Detail anggota grouped
// insight pakai <details> native (bukan state React) supaya komponen ini tetap
// bisa dipakai di server component (Dashboard) tanpa "use client".
export function InsightItem({ insight }: { insight: InsightResult }) {
  const Icon = CATEGORY_ICON[insight.category];
  const style = SEVERITY_STYLE[insight.severity];

  return (
    <li className="flex gap-3 rounded-md border border-neutral-100 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>{style.label}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            {CATEGORY_LABEL[insight.category]}
          </span>
          <p className="text-sm font-medium text-neutral-900">{insight.title}</p>
        </div>
        <p className="text-sm text-neutral-700">{insight.message}</p>
        {insight.action && <p className="text-xs text-neutral-500">Tindakan: {insight.action}</p>}
        {insight.groupMembers && insight.groupMembers.length > 0 && (
          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer select-none font-medium text-neutral-600">
              Lihat {insight.groupMembers.length} cabang terdampak
            </summary>
            <ul className="mt-1 space-y-0.5 pl-3">
              {insight.groupMembers.map((m) => (
                <li key={m.entityId}>
                  {m.entityName}
                  {m.metricValue !== null && m.metricValue !== undefined ? ` — ${m.metricValue}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        {insight.href && (
          <Link href={insight.href} className="inline-block text-xs font-medium text-blue-600 hover:underline">
            Lihat detail
          </Link>
        )}
      </div>
    </li>
  );
}
