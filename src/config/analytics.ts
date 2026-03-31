// Variance severity thresholds (as decimal fractions)
export const VARIANCE_HIGH_PCT = 0.15;
export const VARIANCE_MEDIUM_PCT = 0.1;
export const VARIANCE_LOW_PCT = 0.05;

// Forecast computation windows
export const FORECAST_HISTORY_DAYS = 56; // days of history used to build baseline
export const FORECAST_HORIZON_DAYS = 13; // generate_series(0, N) → N+1 days forward
