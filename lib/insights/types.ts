import type { DailyPoint } from "@/types/analytics";

export type InsightSeverity = "critical" | "warning" | "attention" | "positive" | "info";

export type InsightEntityType = "region" | "branch" | "employee" | "stock_item";

export type InsightCategory =
  | "anomaly"
  | "branch_performance"
  | "cost_ratio"
  | "data_completeness"
  | "stock"
  | "cash_advance"
  | "target"
  | "projection";

// Anggota insight gabungan (mis. daftar cabang di balik satu insight
// kelengkapan-data regional, atau daftar cabang di balik satu anomali
// serentak) - dipakai UI untuk expand/detail tanpa engine tahu bentuk UI-nya.
export type InsightGroupMember = {
  entityId: string;
  entityName: string;
  metricValue?: number | null;
};

export type InsightResult = {
  id: string;
  ruleId: string;
  ruleVersion: string;
  category: InsightCategory;
  severity: InsightSeverity;
  priorityScore: number;
  title: string;
  message: string;
  action?: string;
  entityType: InsightEntityType;
  entityId?: string;
  entityName?: string;
  metricValue?: number | null;
  comparisonValue?: number | null;
  periodStart: string;
  periodEnd: string;
  comparisonStart?: string;
  comparisonEnd?: string;
  sourceModules: string[];
  href?: string;
  generatedAt: string;
  /** Diisi kalau insight ini mewakili beberapa entitas sekaligus (grouped insight). */
  groupMembers?: InsightGroupMember[];
};

// Data satu cabang untuk satu periode (dipakai bersama beberapa rule) - dibangun
// sekali oleh buildInsightContext, bukan di-fetch ulang per rule.
export type BranchInsightData = {
  branchId: string;
  branchName: string;
  isActive: boolean;
  /** Tanggal laporan pertama cabang ini pernah tercatat (null = belum pernah ada laporan sama sekali). */
  firstReportDate: Date | null;
  /** Titik harian periode AKTIF saja (bukan periode pembanding) - untuk deteksi anomali & kelengkapan data. */
  currentPoints: DailyPoint[];
  currentPendapatan: number;
  currentBiaya: number;
  previousPendapatan: number;
  previousBiaya: number;
};

export type InsightContext = {
  branches: BranchInsightData[];
  periodStart: Date;
  periodEnd: Date;
  previousPeriodStart: Date;
  previousPeriodEnd: Date;
  periodLabel: string;
  comparisonLabel: string;
  /** Tanggal saat context dibangun (dipakai untuk klem "jangan hitung hari mendatang"). */
  today: Date;
  generatedAt: string;
};

export type InsightRuleHandler = (context: InsightContext) => InsightResult[];

export type InsightRuleRegistration = {
  ruleId: string;
  version: string;
  enabled: boolean;
  handler: InsightRuleHandler;
};
