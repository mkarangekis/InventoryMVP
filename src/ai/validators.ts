import {
  AiCountSchedule,
  AiDataGap,
  AiMenuSuggestions,
  AiOrderingSummary,
  AiShiftPush,
  AiVarianceExplain,
  AiWeeklyBrief,
} from "@/ai/types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

const isArray = <T = unknown>(value: unknown): value is T[] =>
  Array.isArray(value);

const isOneOf = <T extends string>(value: unknown, options: T[]): value is T =>
  isString(value) && options.includes(value as T);

export const validateOrderingSummary = (
  value: unknown,
): AiOrderingSummary | null => {
  if (!isObject(value)) return null;
  if (!isString(value.summary) || !isNumber(value.confidence)) return null;
  if (!isArray(value.top_actions) || !isArray(value.risk_notes)) return null;

  const top_actions = value.top_actions.filter(isObject).map((item) => ({
    action: isString(item.action) ? item.action : "",
    reason: isString(item.reason) ? item.reason : "",
    urgency: isOneOf(item.urgency, ["low", "med", "high"])
      ? item.urgency
      : "low",
  }));

  const risk_notes = value.risk_notes.filter(isObject).map((item) => ({
    risk: isString(item.risk) ? item.risk : "",
    impact: isString(item.impact) ? item.impact : "",
  }));

  if (top_actions.some((item) => !item.action || !item.reason)) return null;
  if (risk_notes.some((item) => !item.risk || !item.impact)) return null;

  return {
    summary: value.summary,
    top_actions,
    risk_notes,
    confidence: Math.max(0, Math.min(1, value.confidence)),
  };
};

export const validateVarianceExplain = (
  value: unknown,
): AiVarianceExplain | null => {
  if (!isObject(value)) return null;
  if (!isString(value.non_accusatory_note)) return null;
  if (!isArray(value.findings)) return null;

  const findings = value.findings.filter(isObject).map((item) => ({
    item: isString(item.item) ? item.item : "",
    variance_pct: isNumber(item.variance_pct) ? item.variance_pct : 0,
    hypotheses: isArray(item.hypotheses)
      ? item.hypotheses.filter(isString)
      : [],
    recommended_checks: isArray(item.recommended_checks)
      ? item.recommended_checks.filter(isString)
      : [],
    severity: isOneOf(item.severity, ["low", "med", "high"])
      ? item.severity
      : "low",
  }));

  if (findings.some((item) => !item.item)) return null;

  return { findings, non_accusatory_note: value.non_accusatory_note };
};

export const validateWeeklyBrief = (
  value: unknown,
): AiWeeklyBrief | null => {
  if (!isObject(value)) return null;
  if (!isString(value.week_range)) return null;
  if (
    !isArray(value.wins) ||
    !isArray(value.watchouts) ||
    !isArray(value.next_actions)
  ) {
    return null;
  }

  const wins = value.wins.filter(isObject).map((item) => ({
    title: isString(item.title) ? item.title : "",
    detail: isString(item.detail) ? item.detail : "",
  }));

  const watchouts = value.watchouts.filter(isObject).map((item) => ({
    title: isString(item.title) ? item.title : "",
    detail: isString(item.detail) ? item.detail : "",
  }));

  const next_actions = value.next_actions.filter(isObject).map((item) => ({
    action: isString(item.action) ? item.action : "",
    why: isString(item.why) ? item.why : "",
  }));

  const roi = isObject(value.estimated_roi) ? value.estimated_roi : {};
  if (
    !isNumber(roi.time_saved_hours) ||
    !isNumber(roi.waste_reduced_usd) ||
    !isNumber(roi.stockouts_avoided_est)
  ) {
    return null;
  }

  return {
    week_range: value.week_range,
    wins,
    watchouts,
    next_actions,
    estimated_roi: {
      time_saved_hours: roi.time_saved_hours,
      waste_reduced_usd: roi.waste_reduced_usd,
      stockouts_avoided_est: roi.stockouts_avoided_est,
    },
  };
};

export const validateMenuSuggestions = (
  value: unknown,
): AiMenuSuggestions | null => {
  if (!isObject(value) || !isArray(value.suggestions)) return null;

  const suggestions = value.suggestions.filter(isObject).map((item) => ({
    drink: isString(item.drink) ? item.drink : "",
    current_price: isNumber(item.current_price) ? item.current_price : 0,
    suggested_price: isNumber(item.suggested_price) ? item.suggested_price : 0,
    margin_impact_monthly: isNumber(item.margin_impact_monthly)
      ? item.margin_impact_monthly
      : 0,
    rationale: isString(item.rationale) ? item.rationale : "",
    risk: isString(item.risk) ? item.risk : "",
  }));

  if (suggestions.some((item) => !item.drink || !item.rationale)) return null;

  return { suggestions };
};

export const validateShiftPush = (value: unknown): AiShiftPush | null => {
  if (!isObject(value) || !isArray(value.push_items)) return null;

  const push_items = value.push_items.filter(isObject).map((item) => ({
    item: isString(item.item) ? item.item : "",
    why: isString(item.why) ? item.why : "",
    script: isString(item.script) ? item.script : "",
    priority: isOneOf(item.priority, ["low", "med", "high"])
      ? item.priority
      : "low",
  }));

  if (push_items.some((item) => !item.item || !item.script)) return null;

  return { push_items };
};

export const validateCountSchedule = (
  value: unknown,
): AiCountSchedule | null => {
  if (!isObject(value) || !isArray(value.cadence)) return null;

  const cadence = value.cadence.filter(isObject).map((item) => ({
    item: isString(item.item) ? item.item : "",
    recommended_frequency: isOneOf(item.recommended_frequency, [
      "weekly",
      "biweekly",
      "monthly",
    ])
      ? item.recommended_frequency
      : "monthly",
    why: isString(item.why) ? item.why : "",
    variance_score: isNumber(item.variance_score) ? item.variance_score : 0,
  }));

  if (cadence.some((item) => !item.item || !item.why)) return null;

  return { cadence };
};

export const validateDataGap = (value: unknown): AiDataGap | null => {
  if (!isObject(value) || !isArray(value.gaps)) return null;

  const gaps = value.gaps.filter(isObject).map((item) => ({
    gap: isString(item.gap) ? item.gap : "",
    why_it_matters: isString(item.why_it_matters) ? item.why_it_matters : "",
    expected_improvement: isString(item.expected_improvement)
      ? item.expected_improvement
      : "",
    how_to_collect: isString(item.how_to_collect) ? item.how_to_collect : "",
    priority: isOneOf(item.priority, ["low", "med", "high"])
      ? item.priority
      : "low",
  }));

  if (gaps.some((item) => !item.gap || !item.why_it_matters)) return null;

  return { gaps };
};
