type RuntimeFlags = Partial<
  Record<
    "ENTERPRISE_UI" | "AI_TOP_PANEL" | "GRAPHS_OVERVIEW" | "SUBSCRIPTION_GATING",
    string | undefined
  >
>;

const readRuntimeFlag = (key: keyof RuntimeFlags): string | undefined => {
  if (typeof window !== "undefined") {
    return (window as unknown as { __BAROPS_FLAGS?: RuntimeFlags }).__BAROPS_FLAGS?.[
      key
    ];
  }

  return process.env[key];
};

const isEnabled = (value: string | undefined, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return value === "true";
};

// Backward-compatible: previously hard-enabled.
export const isEnterpriseUIEnabled = () =>
  isEnabled(readRuntimeFlag("ENTERPRISE_UI"), true);

export const isAiTopPanelEnabled = () =>
  isEnabled(readRuntimeFlag("AI_TOP_PANEL"), false);

export const isGraphsOverviewEnabled = () =>
  isEnabled(readRuntimeFlag("GRAPHS_OVERVIEW"), false);

export const isSubscriptionGatingEnabled = () =>
  isEnabled(readRuntimeFlag("SUBSCRIPTION_GATING"), false);
