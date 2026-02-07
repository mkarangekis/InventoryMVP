export {};

declare global {
  interface Window {
    __BAROPS_FLAGS?: Partial<
      Record<
        "ENTERPRISE_UI" | "AI_TOP_PANEL" | "GRAPHS_OVERVIEW" | "SUBSCRIPTION_GATING",
        string | undefined
      >
    >;
  }
}

