import {
  AiCountSchedule,
  AiDataGap,
  AiMenuSuggestions,
  AiOrderingSummary,
  AiShiftPush,
  AiVarianceExplain,
  AiWeeklyBrief,
} from "@/ai/types";

export const fallbackOrderingSummary = (summary: string): AiOrderingSummary => ({
  summary,
  top_actions: [],
  risk_notes: [],
  confidence: 0.2,
});

export const fallbackVarianceExplain = (note: string): AiVarianceExplain => ({
  findings: [],
  non_accusatory_note: note,
});

export const fallbackWeeklyBrief = (week_range: string): AiWeeklyBrief => ({
  week_range,
  wins: [],
  watchouts: [],
  next_actions: [],
  estimated_roi: {
    time_saved_hours: 0,
    waste_reduced_usd: 0,
    stockouts_avoided_est: 0,
  },
});

export const fallbackMenuSuggestions = (
  reason: string,
): AiMenuSuggestions => ({
  suggestions: [
    {
      drink: "Not enough data",
      current_price: 0,
      suggested_price: 0,
      margin_impact_monthly: 0,
      rationale: reason,
      risk: "low",
    },
  ],
});

export const fallbackShiftPush = (reason: string): AiShiftPush => ({
  push_items: [
    {
      item: "No push items yet",
      why: reason,
      script: "Let me know if you'd like to spotlight a seasonal special tonight.",
      priority: "low",
    },
  ],
});

export const fallbackCountSchedule = (
  reason: string,
): AiCountSchedule => ({
  cadence: [
    {
      item: "Key spirits",
      recommended_frequency: "monthly",
      why: reason,
      variance_score: 0,
    },
  ],
});

export const fallbackDataGap = (reason: string): AiDataGap => ({
  gaps: [
    {
      gap: "Limited operational data available",
      why_it_matters: reason,
      expected_improvement: "Better forecasting and variance insights.",
      how_to_collect: "Connect POS and complete initial inventory counts.",
      priority: "high",
    },
  ],
});
