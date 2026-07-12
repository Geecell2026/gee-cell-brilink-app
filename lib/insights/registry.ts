import type { InsightRuleRegistration } from "./types";
import { generateBranchAnomalyInsights, RULE_ID as ANOMALY_ID, RULE_VERSION as ANOMALY_VERSION } from "./rules/branch-anomaly";
import {
  generateBranchTrendContributionInsights,
  RULE_ID as TREND_ID,
  RULE_VERSION as TREND_VERSION,
} from "./rules/branch-trend-contribution";
import { generateCostRatioInsights, RULE_ID as COST_RATIO_ID, RULE_VERSION as COST_RATIO_VERSION } from "./rules/cost-ratio";
import {
  generateDataCompletenessInsights,
  RULE_ID as COMPLETENESS_ID,
  RULE_VERSION as COMPLETENESS_VERSION,
} from "./rules/data-completeness";

// Rule Stock, Kasbon, Target, dan Proyeksi belum aktif di versi pertama ini -
// menambahkannya nanti cukup: tulis rules/<nama>.ts (handler menerima
// InsightContext, kembalikan InsightResult[]) lalu daftarkan satu baris di
// sini. Engine (engine.ts) tidak perlu diubah sama sekali.
export const insightRuleRegistry: InsightRuleRegistration[] = [
  { ruleId: ANOMALY_ID, version: ANOMALY_VERSION, enabled: true, handler: generateBranchAnomalyInsights },
  { ruleId: TREND_ID, version: TREND_VERSION, enabled: true, handler: generateBranchTrendContributionInsights },
  { ruleId: COST_RATIO_ID, version: COST_RATIO_VERSION, enabled: true, handler: generateCostRatioInsights },
  { ruleId: COMPLETENESS_ID, version: COMPLETENESS_VERSION, enabled: true, handler: generateDataCompletenessInsights },
];
