const isEnabled = (value: string | undefined) => value === "true";

export const isAiFeaturesEnabled = () =>
  isEnabled(process.env.AI_FEATURES_ENABLED);

export const aiFeatureFlags = {
  orderingCopilot: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_ORDERING_COPILOT),
  varianceExplain: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_VARIANCE_EXPLAIN),
  weeklyBrief: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_WEEKLY_BRIEF),
  menuSuggestions: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_MENU_SUGGESTIONS),
  shiftPush: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_SHIFT_PUSH),
  countScheduler: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_COUNT_SCHEDULER),
  dataGap: () =>
    isAiFeaturesEnabled() && isEnabled(process.env.AI_DATA_GAP),
};
