"use client";

import { useMemo, useState } from "react";
import type { InsightCategory, InsightResult, InsightSeverity } from "@/lib/insights/types";
import { InsightItem, CATEGORY_LABEL, SEVERITY_STYLE } from "./insight-item";

type GroupBy = "urgency" | "category" | "branch";

const SEVERITY_OPTIONS: { value: InsightSeverity | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "critical", label: SEVERITY_STYLE.critical.label },
  { value: "warning", label: SEVERITY_STYLE.warning.label },
  { value: "attention", label: SEVERITY_STYLE.attention.label },
  { value: "positive", label: SEVERITY_STYLE.positive.label },
  { value: "info", label: SEVERITY_STYLE.info.label },
];

// Kategori yang belum punya rule aktif (stock/kasbon/target/proyeksi) sengaja
// tetap didaftarkan di sini - begitu rule-nya aktif di registry, langsung
// muncul di dropdown tanpa perlu ubah komponen ini.
const CATEGORY_OPTIONS: { value: InsightCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "anomaly", label: CATEGORY_LABEL.anomaly },
  { value: "branch_performance", label: CATEGORY_LABEL.branch_performance },
  { value: "cost_ratio", label: CATEGORY_LABEL.cost_ratio },
  { value: "data_completeness", label: CATEGORY_LABEL.data_completeness },
];

const CATEGORY_URUTAN: InsightCategory[] = [
  "anomaly", "branch_performance", "cost_ratio", "data_completeness", "stock", "cash_advance", "target", "projection",
];

const selectClass =
  "rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none";

export function InsightExplorer({
  insights,
  branches,
}: {
  insights: InsightResult[];
  branches: { id: string; name: string }[];
}) {
  const [severity, setSeverity] = useState<InsightSeverity | "all">("all");
  const [category, setCategory] = useState<InsightCategory | "all">("all");
  const [branchId, setBranchId] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("urgency");

  const filtered = useMemo(() => {
    return insights.filter((i) => {
      if (severity !== "all" && i.severity !== severity) return false;
      if (category !== "all" && i.category !== category) return false;
      if (branchId !== "all") {
        const cocokLangsung = i.entityId === branchId;
        const cocokAnggotaGrup = i.groupMembers?.some((m) => m.entityId === branchId) ?? false;
        if (!cocokLangsung && !cocokAnggotaGrup) return false;
      }
      return true;
    });
  }, [insights, severity, category, branchId]);

  const adaFilterAktif = severity !== "all" || category !== "all" || branchId !== "all";
  function resetFilter() {
    setSeverity("all");
    setCategory("all");
    setBranchId("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as InsightSeverity | "all")}
            className={selectClass}
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as InsightCategory | "all")}
            className={selectClass}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">Cabang</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass}>
            <option value="all">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">Tampilan</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={selectClass}>
            <option value="urgency">Urutkan berdasarkan urgensi</option>
            <option value="category">Kelompokkan berdasarkan kategori</option>
            <option value="branch">Kelompokkan berdasarkan cabang</option>
          </select>
        </div>
        {adaFilterAktif && (
          <button
            type="button"
            onClick={resetFilter}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            Reset Filter
          </button>
        )}
        <p className="ml-auto text-xs text-neutral-500">{filtered.length} insight</p>
      </div>

      <InsightHasil filtered={filtered} groupBy={groupBy} adaFilterAktif={adaFilterAktif} totalSemula={insights.length} />
    </div>
  );
}

function InsightHasil({
  filtered,
  groupBy,
  adaFilterAktif,
  totalSemula,
}: {
  filtered: InsightResult[];
  groupBy: GroupBy;
  adaFilterAktif: boolean;
  totalSemula: number;
}) {
  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        {totalSemula === 0
          ? "Belum cukup data untuk menghasilkan insight."
          : adaFilterAktif
            ? "Tidak ada insight untuk severity, kategori, atau cabang yang dipilih."
            : "Belum cukup data untuk menghasilkan insight."}
      </p>
    );
  }

  if (groupBy === "urgency") {
    return (
      <ul className="space-y-3">
        {filtered.map((i) => (
          <InsightItem key={i.id} insight={i} />
        ))}
      </ul>
    );
  }

  if (groupBy === "category") {
    const kelompok = new Map<InsightCategory, InsightResult[]>();
    for (const i of filtered) {
      if (!kelompok.has(i.category)) kelompok.set(i.category, []);
      kelompok.get(i.category)!.push(i);
    }
    const urutanTerpakai = CATEGORY_URUTAN.filter((c) => kelompok.has(c));
    return (
      <div className="space-y-5">
        {urutanTerpakai.map((cat) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {CATEGORY_LABEL[cat]} ({kelompok.get(cat)!.length})
            </h3>
            <ul className="space-y-3">
              {kelompok.get(cat)!.map((i) => (
                <InsightItem key={i.id} insight={i} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  // groupBy === "branch"
  const kelompokCabang = new Map<string, InsightResult[]>();
  const lintasCabang: InsightResult[] = [];
  for (const i of filtered) {
    if (i.entityType === "branch" && i.entityName) {
      if (!kelompokCabang.has(i.entityName)) kelompokCabang.set(i.entityName, []);
      kelompokCabang.get(i.entityName)!.push(i);
    } else {
      lintasCabang.push(i);
    }
  }
  const namaCabangUrut = Array.from(kelompokCabang.keys()).sort();
  return (
    <div className="space-y-5">
      {namaCabangUrut.map((nama) => (
        <div key={nama}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            {nama} ({kelompokCabang.get(nama)!.length})
          </h3>
          <ul className="space-y-3">
            {kelompokCabang.get(nama)!.map((i) => (
              <InsightItem key={i.id} insight={i} />
            ))}
          </ul>
        </div>
      ))}
      {lintasCabang.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Wilayah / Lintas Cabang ({lintasCabang.length})
          </h3>
          <ul className="space-y-3">
            {lintasCabang.map((i) => (
              <InsightItem key={i.id} insight={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
