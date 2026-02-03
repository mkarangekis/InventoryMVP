export type AiOrderingSummary = {
  summary: string;
  top_actions: { action: string; reason: string; urgency: "low" | "med" | "high" }[];
  risk_notes: { risk: string; impact: string }[];
  confidence: number;
};

export type AiVarianceExplain = {
  findings: {
    item: string;
    variance_pct: number;
    hypotheses: string[];
    recommended_checks: string[];
    severity: "low" | "med" | "high";
  }[];
  non_accusatory_note: string;
};

export type AiWeeklyBrief = {
  week_range: string;
  wins: { title: string; detail: string }[];
  watchouts: { title: string; detail: string }[];
  next_actions: { action: string; why: string }[];
  estimated_roi: {
    time_saved_hours: number;
    waste_reduced_usd: number;
    stockouts_avoided_est: number;
  };
};

export type AiMenuSuggestions = {
  suggestions: {
    drink: string;
    current_price: number;
    suggested_price: number;
    margin_impact_monthly: number;
    rationale: string;
    risk: string;
  }[];
};

export type AiShiftPush = {
  push_items: {
    item: string;
    why: string;
    script: string;
    priority: "low" | "med" | "high";
  }[];
};

export type AiCountSchedule = {
  cadence: {
    item: string;
    recommended_frequency: "weekly" | "biweekly" | "monthly";
    why: string;
    variance_score: number;
  }[];
};

export type AiDataGap = {
  gaps: {
    gap: string;
    why_it_matters: string;
    expected_improvement: string;
    how_to_collect: string;
    priority: "low" | "med" | "high";
  }[];
};
