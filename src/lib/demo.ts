const dayMs = 24 * 60 * 60 * 1000;

export const DEMO_EMAIL = "mitchellskarangekis@gmail.com";
export const DEMO_TENANT_ID = "demo-tenant-001";
export const DEMO_LOCATION_ID = "demo-location-001";
export const DEMO_VENDOR_ID = "demo-vendor-001";

export const isDemoEmail = (email?: string | null) =>
  Boolean(email) && email?.toLowerCase() === DEMO_EMAIL;

export const demoLocation = {
  id: DEMO_LOCATION_ID,
  name: "Mitchell's Cocktail Bar — Midtown",
};

export const demoIngredients = [
  { id: "demo-ing-1", name: "Tito's Handmade Vodka", type: "spirit" },
  { id: "demo-ing-2", name: "Jameson Irish Whiskey", type: "spirit" },
  { id: "demo-ing-3", name: "Patrón Silver Tequila", type: "spirit" },
  { id: "demo-ing-4", name: "Cointreau", type: "liqueur" },
  { id: "demo-ing-5", name: "Fresh Lime Juice", type: "mixer" },
  { id: "demo-ing-6", name: "Simple Syrup", type: "mixer" },
  { id: "demo-ing-7", name: "Angostura Bitters", type: "other" },
  { id: "demo-ing-8", name: "Draft IPA", type: "beer" },
  { id: "demo-ing-9", name: "House Red Wine", type: "wine" },
  { id: "demo-ing-10", name: "Cold Brew Coffee", type: "other" },
  { id: "demo-ing-11", name: "Hendrick's Gin", type: "spirit" },
  { id: "demo-ing-12", name: "Aperol", type: "liqueur" },
];

export const demoInventoryItems = [
  {
    id: "demo-item-1",
    location_id: DEMO_LOCATION_ID,
    name: "Tito's Vodka 1.75L",
    container_type: "bottle",
    container_size_oz: 59.2,
  },
  {
    id: "demo-item-2",
    location_id: DEMO_LOCATION_ID,
    name: "Jameson 750ml",
    container_type: "bottle",
    container_size_oz: 25.4,
  },
  {
    id: "demo-item-3",
    location_id: DEMO_LOCATION_ID,
    name: "Patrón Silver 750ml",
    container_type: "bottle",
    container_size_oz: 25.4,
  },
  {
    id: "demo-item-4",
    location_id: DEMO_LOCATION_ID,
    name: "Cointreau 750ml",
    container_type: "bottle",
    container_size_oz: 25.4,
  },
  {
    id: "demo-item-5",
    location_id: DEMO_LOCATION_ID,
    name: "Fresh Lime Juice",
    container_type: "bottle",
    container_size_oz: 32,
  },
  {
    id: "demo-item-6",
    location_id: DEMO_LOCATION_ID,
    name: "Simple Syrup",
    container_type: "bottle",
    container_size_oz: 32,
  },
  {
    id: "demo-item-7",
    location_id: DEMO_LOCATION_ID,
    name: "Angostura Bitters",
    container_type: "bottle",
    container_size_oz: 5,
  },
  {
    id: "demo-item-8",
    location_id: DEMO_LOCATION_ID,
    name: "Draft IPA Keg",
    container_type: "keg",
    container_size_oz: 1984,
  },
  {
    id: "demo-item-9",
    location_id: DEMO_LOCATION_ID,
    name: "Hendrick's Gin 750ml",
    container_type: "bottle",
    container_size_oz: 25.4,
  },
  {
    id: "demo-item-10",
    location_id: DEMO_LOCATION_ID,
    name: "Aperol 750ml",
    container_type: "bottle",
    container_size_oz: 25.4,
  },
];

export const demoMenuItems = [
  { id: "demo-menu-1", name: "House Margarita", base_price: 12 },
  { id: "demo-menu-2", name: "Old Fashioned", base_price: 14 },
  { id: "demo-menu-3", name: "Moscow Mule", base_price: 13 },
  { id: "demo-menu-4", name: "Espresso Martini", base_price: 15 },
  { id: "demo-menu-5", name: "Draft IPA", base_price: 8 },
  { id: "demo-menu-6", name: "Negroni", base_price: 14 },
  { id: "demo-menu-7", name: "Aperol Spritz", base_price: 13 },
  { id: "demo-menu-8", name: "Gin & Tonic", base_price: 12 },
];

const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * dayMs).toISOString().slice(0, 10);

// Current week flags (5 items)
const currentWeekStart = isoDate(-7);
// Previous week flags (3 items)
const prevWeekStart = isoDate(-14);

export const demoVarianceFlags = [
  // Current week — high severity
  {
    id: "demo-flag-1",
    week_start_date: currentWeekStart,
    inventory_item_id: "demo-item-1",
    expected_remaining_oz: "28.0",
    actual_remaining_oz: "21.5",
    variance_oz: "-6.5",
    variance_pct: "-23.2",
    severity: "high",
    location_id: DEMO_LOCATION_ID,
    item_name: "Tito's Vodka 1.75L",
  },
  {
    id: "demo-flag-2",
    week_start_date: currentWeekStart,
    inventory_item_id: "demo-item-3",
    expected_remaining_oz: "12.0",
    actual_remaining_oz: "8.4",
    variance_oz: "-3.6",
    variance_pct: "-30.0",
    severity: "high",
    location_id: DEMO_LOCATION_ID,
    item_name: "Patrón Silver 750ml",
  },
  // Current week — medium severity
  {
    id: "demo-flag-3",
    week_start_date: currentWeekStart,
    inventory_item_id: "demo-item-5",
    expected_remaining_oz: "18.0",
    actual_remaining_oz: "14.5",
    variance_oz: "-3.5",
    variance_pct: "-19.4",
    severity: "med",
    location_id: DEMO_LOCATION_ID,
    item_name: "Fresh Lime Juice",
  },
  {
    id: "demo-flag-4",
    week_start_date: currentWeekStart,
    inventory_item_id: "demo-item-8",
    expected_remaining_oz: "142.0",
    actual_remaining_oz: "133.1",
    variance_oz: "-8.9",
    variance_pct: "-6.3",
    severity: "med",
    location_id: DEMO_LOCATION_ID,
    item_name: "Draft IPA Keg",
  },
  // Current week — low severity
  {
    id: "demo-flag-5",
    week_start_date: currentWeekStart,
    inventory_item_id: "demo-item-4",
    expected_remaining_oz: "20.5",
    actual_remaining_oz: "18.7",
    variance_oz: "-1.8",
    variance_pct: "-8.8",
    severity: "low",
    location_id: DEMO_LOCATION_ID,
    item_name: "Cointreau 750ml",
  },
  // Previous week — showing improving trend
  {
    id: "demo-flag-6",
    week_start_date: prevWeekStart,
    inventory_item_id: "demo-item-2",
    expected_remaining_oz: "22.0",
    actual_remaining_oz: "17.8",
    variance_oz: "-4.2",
    variance_pct: "-19.1",
    severity: "med",
    location_id: DEMO_LOCATION_ID,
    item_name: "Jameson 750ml",
  },
  {
    id: "demo-flag-7",
    week_start_date: prevWeekStart,
    inventory_item_id: "demo-item-1",
    expected_remaining_oz: "30.0",
    actual_remaining_oz: "22.2",
    variance_oz: "-7.8",
    variance_pct: "-26.0",
    severity: "high",
    location_id: DEMO_LOCATION_ID,
    item_name: "Tito's Vodka 1.75L",
  },
  {
    id: "demo-flag-8",
    week_start_date: prevWeekStart,
    inventory_item_id: "demo-item-6",
    expected_remaining_oz: "24.0",
    actual_remaining_oz: "21.4",
    variance_oz: "-2.6",
    variance_pct: "-10.8",
    severity: "low",
    location_id: DEMO_LOCATION_ID,
    item_name: "Simple Syrup",
  },
];

// Multi-item forecast — 4 items × 14 days
const forecastItems = [
  { id: "demo-item-1", name: "Tito's Vodka 1.75L", baseOz: 22, amplitude: 4 },
  { id: "demo-item-3", name: "Patrón Silver 750ml", baseOz: 11, amplitude: 2 },
  { id: "demo-item-8", name: "Draft IPA Keg", baseOz: 62, amplitude: 18 },
  { id: "demo-item-5", name: "Fresh Lime Juice", baseOz: 16, amplitude: 3 },
];

export const demoForecast = forecastItems.flatMap(({ id, baseOz, amplitude }) =>
  Array.from({ length: 14 }, (_, i) => ({
    forecast_date: isoDate(i),
    inventory_item_id: id,
    // Weekend bump on days 5,6,12,13
    forecast_usage_oz: Math.round(
      (baseOz + (i % 7 >= 5 ? amplitude : Math.floor(amplitude * 0.4))) * 10,
    ) / 10,
    location_id: DEMO_LOCATION_ID,
  })),
);

// Analytics overview — for charts on dashboard
export const demoAnalyticsOverview = {
  forecastByDay: Array.from({ length: 14 }, (_, i) => {
    const weekendBoost = i % 7 >= 5 ? 30 : 0;
    return {
      date: isoDate(i),
      total_usage_oz: 111 + weekendBoost + (i % 3) * 4,
    };
  }),
  varianceByWeek: [
    { week_start_date: isoDate(-49), total_abs_variance_oz: 32.4, flag_count: 6 },
    { week_start_date: isoDate(-42), total_abs_variance_oz: 29.1, flag_count: 5 },
    { week_start_date: isoDate(-35), total_abs_variance_oz: 34.8, flag_count: 7 },
    { week_start_date: isoDate(-28), total_abs_variance_oz: 27.6, flag_count: 5 },
    { week_start_date: isoDate(-21), total_abs_variance_oz: 25.2, flag_count: 4 },
    { week_start_date: isoDate(-14), total_abs_variance_oz: 22.3, flag_count: 4 },
    { week_start_date: isoDate(-7), total_abs_variance_oz: 24.3, flag_count: 5 },
  ],
  topForecastItems: [
    { inventory_item_id: "demo-item-8", item_name: "Draft IPA Keg", total_usage_oz: 868 },
    { inventory_item_id: "demo-item-1", item_name: "Tito's Vodka 1.75L", total_usage_oz: 308 },
    { inventory_item_id: "demo-item-5", item_name: "Fresh Lime Juice", total_usage_oz: 224 },
    { inventory_item_id: "demo-item-3", item_name: "Patrón Silver 750ml", total_usage_oz: 154 },
    { inventory_item_id: "demo-item-2", item_name: "Jameson 750ml", total_usage_oz: 112 },
  ],
  stockoutRisk: [
    { inventory_item_id: "demo-item-1", item_name: "Tito's Vodka 1.75L", forecast_next_14d_oz: 308 },
    { inventory_item_id: "demo-item-3", item_name: "Patrón Silver 750ml", forecast_next_14d_oz: 154 },
  ],
};

// Need vs onhand — inventory chart
export const demoNeedVsOnhand = {
  snapshotDate: isoDate(-1),
  items: [
    { inventory_item_id: "demo-item-1", item_name: "Tito's Vodka 1.75L", on_hand_oz: 118.4, forecast_next_14d_oz: 308.0 },
    { inventory_item_id: "demo-item-8", item_name: "Draft IPA Keg", on_hand_oz: 992.0, forecast_next_14d_oz: 868.0 },
    { inventory_item_id: "demo-item-3", item_name: "Patrón Silver 750ml", on_hand_oz: 50.8, forecast_next_14d_oz: 154.0 },
    { inventory_item_id: "demo-item-5", item_name: "Fresh Lime Juice", on_hand_oz: 64.0, forecast_next_14d_oz: 224.0 },
    { inventory_item_id: "demo-item-2", item_name: "Jameson 750ml", on_hand_oz: 76.2, forecast_next_14d_oz: 112.0 },
    { inventory_item_id: "demo-item-9", item_name: "Hendrick's Gin 750ml", on_hand_oz: 50.8, forecast_next_14d_oz: 56.0 },
    { inventory_item_id: "demo-item-6", item_name: "Simple Syrup", on_hand_oz: 96.0, forecast_next_14d_oz: 84.0 },
    { inventory_item_id: "demo-item-4", item_name: "Cointreau 750ml", on_hand_oz: 50.8, forecast_next_14d_oz: 42.0 },
  ],
};

// Shrinkage clusters
export const demoShrinkageClusters = {
  clusters: [
    {
      cluster_id: "spirits-over-pour",
      label: "Spirits Over-Pour Group",
      type: "pour_variance" as const,
      items: ["Tito's Vodka 1.75L", "Jameson 750ml"],
      total_shrinkage_usd: 186,
      avg_z_score: 2.3,
      description: "High-volume spirits showing consistent negative variance, particularly on Friday and Saturday shifts. Pattern consistent with free-pouring instead of measured pours.",
      recommended_action: "Enforce jigger use on all spirits. Run a pour-accuracy drill with Friday/Saturday staff this week.",
      urgency: "high" as const,
    },
    {
      cluster_id: "premium-leakage",
      label: "Premium Pour Leakage",
      type: "theft_pattern" as const,
      items: ["Patrón Silver 750ml", "Cointreau 750ml"],
      total_shrinkage_usd: 94,
      avg_z_score: 2.8,
      description: "Premium spirits showing above-average variance outside of peak service hours. No matching void/comp records. Pattern may indicate unrecorded pours or stock access.",
      recommended_action: "Audit who has access to well area after service. Check security footage for Thursday-Friday 10pm–2am window.",
      urgency: "high" as const,
    },
    {
      cluster_id: "prep-waste-loop",
      label: "Prep Waste Loop",
      type: "waste" as const,
      items: ["Fresh Lime Juice", "Simple Syrup"],
      total_shrinkage_usd: 32,
      avg_z_score: 1.4,
      description: "Mixers showing predictable 15-20% over-usage relative to cocktail sales. Likely caused by batch prep loss and inconsistent recipe adherence during rush.",
      recommended_action: "Measure and record batch yields. Brief bartenders on standard lime/syrup ratios. Track prep waste in count sheet.",
      urgency: "med" as const,
    },
    {
      cluster_id: "measurement-noise",
      label: "Low-Impact Data Noise",
      type: "data_quality" as const,
      items: ["Angostura Bitters", "Draft IPA Keg"],
      total_shrinkage_usd: 8,
      avg_z_score: 0.8,
      description: "Low-dollar items with minor variance — likely due to measurement approximation during counts rather than actual loss. Within acceptable tolerance.",
      recommended_action: "No immediate action needed. Standardize counting method for kegs (use sight glass). Bitters variance is within noise range.",
      urgency: "low" as const,
    },
  ],
};

// Audit logs — 20 realistic entries
const userId = "demo-user-001";
const auditEntry = (
  id: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown>,
  offsetDays: number,
  offsetHours = 0,
) => ({
  id,
  action,
  entity_type: entityType,
  entity_id: entityId,
  details,
  location_id: DEMO_LOCATION_ID,
  user_id: userId,
  created_at: new Date(Date.now() + offsetDays * dayMs + offsetHours * 3600 * 1000).toISOString(),
  user_profiles: { email: DEMO_EMAIL },
});

export const demoAuditLogs = {
  logs: [
    auditEntry("al-1", "ordering.approved", "purchase_orders", "demo-po-1", { vendor: "Metro Spirits Supply", total: 312 }, -1, 14),
    auditEntry("al-2", "ordering.sent", "purchase_orders", "demo-po-1", { vendor: "Metro Spirits Supply", email: "orders@metrosupply.com" }, -1, 14),
    auditEntry("al-3", "inventory.snapshot", "inventory_snapshots", "snap-04-02", { item_count: 10, counted_by: DEMO_EMAIL }, -1, 9),
    auditEntry("al-4", "audit.viewed", "audit_logs", null, { filters: { action: null, entityType: null }, limit: 50, offset: 0 }, -1, 8),
    auditEntry("al-5", "ingest.completed", "pos_import_runs", "demo-run-1", { rows_imported: 847, source: "csv" }, -2, 11),
    auditEntry("al-6", "ordering.draft_created", "purchase_orders", "demo-po-2", { vendor: "Fresh Mixers Co.", lines: 2 }, -3, 15),
    auditEntry("al-7", "ordering.draft_created", "purchase_orders", "demo-po-1", { vendor: "Metro Spirits Supply", lines: 2 }, -3, 14),
    auditEntry("al-8", "inventory.snapshot", "inventory_snapshots", "snap-03-31", { item_count: 10, counted_by: DEMO_EMAIL }, -4, 9),
    auditEntry("al-9", "ingest.completed", "pos_import_runs", "demo-run-2", { rows_imported: 912, source: "csv" }, -5, 10),
    auditEntry("al-10", "variance.flagged", "variance_flags", "demo-flag-1", { item: "Tito's Vodka 1.75L", variance_pct: -23.2, severity: "high" }, -7, 7),
    auditEntry("al-11", "variance.flagged", "variance_flags", "demo-flag-2", { item: "Patrón Silver 750ml", variance_pct: -30.0, severity: "high" }, -7, 7),
    auditEntry("al-12", "variance.flagged", "variance_flags", "demo-flag-3", { item: "Fresh Lime Juice", variance_pct: -19.4, severity: "med" }, -7, 7),
    auditEntry("al-13", "ingest.warning", "pos_import_runs", "demo-run-3", { rows_skipped: 3, reason: "missing SKU" }, -9, 13),
    auditEntry("al-14", "inventory.snapshot", "inventory_snapshots", "snap-03-27", { item_count: 10, counted_by: DEMO_EMAIL }, -8, 9),
    auditEntry("al-15", "ordering.approved", "purchase_orders", "demo-po-3", { vendor: "Fresh Mixers Co.", total: 72 }, -10, 16),
    auditEntry("al-16", "ingest.completed", "pos_import_runs", "demo-run-3", { rows_imported: 788, source: "csv" }, -9, 12),
    auditEntry("al-17", "variance.flagged", "variance_flags", "demo-flag-7", { item: "Tito's Vodka 1.75L", variance_pct: -26.0, severity: "high" }, -14, 7),
    auditEntry("al-18", "inventory.snapshot", "inventory_snapshots", "snap-03-23", { item_count: 10, counted_by: DEMO_EMAIL }, -11, 9),
    auditEntry("al-19", "settings.webhook_created", "webhook_endpoints", "wh-001", { url: "https://hooks.slack.com/…", events: ["variance.high"] }, -12, 11),
    auditEntry("al-20", "settings.notifications_updated", "user_notification_prefs", null, { variance_alerts: true, weekly_digest: true }, -14, 16),
  ],
  total: 20,
};

// Notification preferences
export const demoNotificationPrefs = {
  variance_alerts: true,
  reorder_alerts: true,
  weekly_digest: true,
  digest_day: 1,
  alert_threshold: "med",
};

// Webhook endpoints
export const demoWebhookEndpoints = [
  {
    id: "wh-001",
    tenant_id: DEMO_TENANT_ID,
    url: "https://example.com/webhooks/pourdex-variance-alerts",
    events: ["variance.high", "ordering.draft_created"],
    is_active: true,
    secret: null,
    created_at: new Date(Date.now() - 12 * dayMs).toISOString(),
  },
  {
    id: "wh-002",
    tenant_id: DEMO_TENANT_ID,
    url: "https://your-pos-integration.example.com/webhooks/pourdex",
    events: ["inventory.snapshot", "ingest.completed"],
    is_active: false,
    secret: null,
    created_at: new Date(Date.now() - 5 * dayMs).toISOString(),
  },
];

// Ask Your Data — demo canned response
export const demoAskAnswers: Record<string, string> = {
  default:
    "Based on this week's data for Mitchell's Cocktail Bar — Midtown, your biggest cost concern is spirits shrinkage. Tito's Vodka is down 23.2% (-6.5 oz) and Patrón Silver is down 30.0% (-3.6 oz), representing an estimated **$186 in combined loss**. I'd recommend auditing pour technique on your Friday/Saturday shifts and comparing void/comp records against actual variance. Your overall variance this week is 24.3 oz across 5 flags — up slightly from last week's 22.3 oz but down significantly from the 34.8 oz peak three weeks ago.",
  "what is my biggest cost issue":
    "Your biggest cost issue this week is **spirits shrinkage**: Tito's Vodka (-23.2%) and Patrón Silver (-30.0%) together represent roughly $186 in over-usage. Both are trending worse on weekends. Tighten pour standards and run a quick bartender spot-check on Friday before service.",
  "which items should i reorder":
    "Based on your 14-day forecast vs current on-hand:\n\n• **Tito's Vodka 1.75L** — 118 oz on hand vs 308 oz forecasted. Reorder now (3-4 day lead time).\n• **Patrón Silver 750ml** — 50 oz on hand vs 154 oz forecasted. Critical reorder needed.\n• **Fresh Lime Juice** — 64 oz on hand vs 224 oz forecasted. Order this week.\n\nThe draft IPA keg is fine at ~50% on hand against forecast.",
};

export const demoPurchaseOrders = [
  {
    id: "demo-po-1",
    vendor_id: DEMO_VENDOR_ID,
    location_id: DEMO_LOCATION_ID,
    status: "draft",
    created_at: new Date(Date.now() - dayMs).toISOString(),
    vendor: { id: DEMO_VENDOR_ID, name: "Metro Spirits Supply", email: "orders@metrosupply.com" },
    lines: [
      {
        inventory_item_id: "demo-item-1",
        item_name: "Tito's Vodka 1.75L",
        qty_units: 6,
        unit_price: 28,
        line_total: 168,
      },
      {
        inventory_item_id: "demo-item-3",
        item_name: "Patrón Silver 750ml",
        qty_units: 4,
        unit_price: 36,
        line_total: 144,
      },
    ],
  },
  {
    id: "demo-po-2",
    vendor_id: "demo-vendor-2",
    location_id: DEMO_LOCATION_ID,
    status: "draft",
    created_at: new Date(Date.now() - 3 * dayMs).toISOString(),
    vendor: { id: "demo-vendor-2", name: "Fresh Mixers Co.", email: "hello@freshmixers.co" },
    lines: [
      {
        inventory_item_id: "demo-item-5",
        item_name: "Fresh Lime Juice",
        qty_units: 8,
        unit_price: 6,
        line_total: 48,
      },
      {
        inventory_item_id: "demo-item-6",
        item_name: "Simple Syrup",
        qty_units: 6,
        unit_price: 4,
        line_total: 24,
      },
    ],
  },
  {
    id: "demo-po-3",
    vendor_id: "demo-vendor-2",
    location_id: DEMO_LOCATION_ID,
    status: "approved",
    created_at: new Date(Date.now() - 10 * dayMs).toISOString(),
    vendor: { id: "demo-vendor-2", name: "Fresh Mixers Co.", email: "hello@freshmixers.co" },
    lines: [
      {
        inventory_item_id: "demo-item-5",
        item_name: "Fresh Lime Juice",
        qty_units: 6,
        unit_price: 6,
        line_total: 36,
      },
      {
        inventory_item_id: "demo-item-9",
        item_name: "Hendrick's Gin 750ml",
        qty_units: 3,
        unit_price: 34,
        line_total: 102,
      },
    ],
  },
];

export const demoProfitRanking = [
  {
    menu_item_id: "demo-menu-4",
    name: "Espresso Martini",
    qty_sold: 128,
    revenue: 1920,
    price_each: 15,
    cost_per_serv: 3.2,
    profit_per_serv: 11.8,
    margin_pct: 78.7,
    recommendations: ["Top performer — promote on social"],
  },
  {
    menu_item_id: "demo-menu-2",
    name: "Old Fashioned",
    qty_sold: 96,
    revenue: 1344,
    price_each: 14,
    cost_per_serv: 3.6,
    profit_per_serv: 10.4,
    margin_pct: 74.3,
    recommendations: ["Strong margins — feature in staff training"],
  },
  {
    menu_item_id: "demo-menu-7",
    name: "Aperol Spritz",
    qty_sold: 88,
    revenue: 1144,
    price_each: 13,
    cost_per_serv: 3.9,
    profit_per_serv: 9.1,
    margin_pct: 70.0,
    recommendations: ["Growing trend — consider happy hour upsell"],
  },
  {
    menu_item_id: "demo-menu-5",
    name: "Draft IPA",
    qty_sold: 210,
    revenue: 1680,
    price_each: 8,
    cost_per_serv: 2.6,
    profit_per_serv: 5.4,
    margin_pct: 67.5,
    recommendations: ["High volume — monitor keg usage closely"],
  },
  {
    menu_item_id: "demo-menu-1",
    name: "House Margarita",
    qty_sold: 142,
    revenue: 1704,
    price_each: 12,
    cost_per_serv: 4.5,
    profit_per_serv: 7.5,
    margin_pct: 62.5,
    recommendations: ["Raise price $1–$2", "Tighten spec by 0.25 oz"],
  },
  {
    menu_item_id: "demo-menu-6",
    name: "Negroni",
    qty_sold: 74,
    revenue: 1036,
    price_each: 14,
    cost_per_serv: 5.6,
    profit_per_serv: 8.4,
    margin_pct: 60.0,
    recommendations: ["Review Campari spec", "Consider batch option for service speed"],
  },
  {
    menu_item_id: "demo-menu-3",
    name: "Moscow Mule",
    qty_sold: 112,
    revenue: 1456,
    price_each: 13,
    cost_per_serv: 5.2,
    profit_per_serv: 7.8,
    margin_pct: 60.0,
    recommendations: ["Ginger beer cost up — recalculate spec"],
  },
  {
    menu_item_id: "demo-menu-8",
    name: "Gin & Tonic",
    qty_sold: 98,
    revenue: 1176,
    price_each: 12,
    cost_per_serv: 5.8,
    profit_per_serv: 6.2,
    margin_pct: 51.7,
    recommendations: ["Below target margin — review tonic cost", "Consider Hendrick's upsell at $2 premium"],
  },
];

export const demoIngestRuns = [
  {
    id: "demo-run-1",
    location_id: DEMO_LOCATION_ID,
    location_name: demoLocation.name,
    source: "csv",
    status: "completed",
    started_at: new Date(Date.now() - 2 * dayMs).toISOString(),
    finished_at: new Date(Date.now() - 2 * dayMs + 18 * 60 * 1000).toISOString(),
    error_summary: null,
  },
  {
    id: "demo-run-2",
    location_id: DEMO_LOCATION_ID,
    location_name: demoLocation.name,
    source: "csv",
    status: "completed",
    started_at: new Date(Date.now() - 5 * dayMs).toISOString(),
    finished_at: new Date(Date.now() - 5 * dayMs + 22 * 60 * 1000).toISOString(),
    error_summary: null,
  },
  {
    id: "demo-run-3",
    location_id: DEMO_LOCATION_ID,
    location_name: demoLocation.name,
    source: "csv",
    status: "warning",
    started_at: new Date(Date.now() - 9 * dayMs).toISOString(),
    finished_at: new Date(Date.now() - 9 * dayMs + 25 * 60 * 1000).toISOString(),
    error_summary: "3 rows skipped (missing SKU)",
  },
];

export const demoIngestRows = [
  {
    row_type: "orders",
    row_number: 12,
    row_data: { order_id: "A-1842", closed_at: isoDate(-1), gross: 186.5 },
  },
  {
    row_type: "order_items",
    row_number: 45,
    row_data: { order_id: "A-1842", item: "House Margarita", qty: 2, gross: 24 },
  },
  {
    row_type: "modifiers",
    row_number: 88,
    row_data: { order_id: "A-1842", modifier: "Top Shelf", gross: 4 },
  },
];

export const demoAiOrderingSummary = {
  summary:
    "Two draft orders are pending approval totalling $384. Spirits are the critical reorder this week — Tito's and Patrón are both projected to hit stockout before Friday night without an approved order.",
  top_actions: [
    {
      action: "Approve Metro Spirits draft ($312 total)",
      reason: "Vodka and tequila on track for stockout by Thursday at current pace",
      urgency: "high",
    },
    {
      action: "Approve Fresh Mixers draft ($72 total)",
      reason: "Lime and syrup trending below par level for weekend demand",
      urgency: "med",
    },
  ],
  risk_notes: [
    {
      risk: "Patrón stockout risk — Friday high",
      impact: "Loss of 14–18 Margarita and Paloma sales (~$180 revenue)",
    },
    {
      risk: "Tito's lead time 3 days",
      impact: "Order today to ensure delivery before weekend service",
    },
  ],
  confidence: 0.86,
};

export const demoAiVarianceExplain = {
  findings: [
    {
      item: "Tito's Vodka 1.75L",
      variance_pct: -23.2,
      hypotheses: [
        "Free-pouring on high-volume Friday/Saturday nights",
        "Unrecorded complimentary drinks during happy hour",
        "Measurement rounding during weekly count",
      ],
      recommended_checks: [
        "Pull Friday/Saturday bartender activity from POS — compare transaction velocity vs variance timing",
        "Check comp log from last 7 days for unmatched vodka pours",
        "Spot-count Tito's mid-shift this Friday",
      ],
      severity: "high",
    },
    {
      item: "Patrón Silver 750ml",
      variance_pct: -30.0,
      hypotheses: [
        "After-hours access to premium well — no matching transactions",
        "Over-spec on Margarita builds during rush",
      ],
      recommended_checks: [
        "Review security access log for bar area after 11pm last 7 days",
        "Audit Margarita spec compliance — check Patrón pour vs recipe card",
      ],
      severity: "high",
    },
    {
      item: "Fresh Lime Juice",
      variance_pct: -19.4,
      hypotheses: ["Batch prep loss during juice extraction", "Waste during peak service rush"],
      recommended_checks: [
        "Weigh limes pre/post batch press and log yield",
        "Brief prep staff on standard 1.5 oz recipe spec",
      ],
      severity: "med",
    },
  ],
  non_accusatory_note:
    "These are possible operational causes, not conclusions. Please investigate before drawing any decisions.",
};

export const demoAiWeeklyBrief = {
  week_range: "Last 7 days",
  wins: [
    {
      title: "Espresso Martini margin leadership",
      detail: "78.7% margin, 128 sold — your top earner and up 12% vs prior week. Staff are clearly promoting it well.",
    },
    {
      title: "Draft IPA volume record",
      detail: "210 pints sold — up 8% vs prior week. Keg rotation adjustment is working.",
    },
    {
      title: "Variance trend improving",
      detail: "Total abs variance dropped from 34.8 oz (3 weeks ago) to 24.3 oz this week — a 30% improvement.",
    },
  ],
  watchouts: [
    {
      title: "Patrón variance spike",
      detail: "30% negative variance this week — worst in 8 weeks. Needs investigation before Friday.",
    },
    {
      title: "Lime juice usage creeping up",
      detail: "Consistent 15-20% over-usage for 3 weeks. Batch prep process likely needs standardizing.",
    },
    {
      title: "Gin & Tonic below margin target",
      detail: "51.7% margin — below your 60% target. Tonic cost increase hasn't been absorbed in pricing.",
    },
  ],
  next_actions: [
    { action: "Investigate Patrón variance before Friday service", why: "30% loss rate — high severity, potential theft pattern." },
    { action: "Approve Metro Spirits PO", why: "Vodka and tequila stockout risk by end of week." },
    { action: "Standardize lime batch yield process", why: "3-week waste pattern costing ~$12/week in lime." },
    { action: "Raise Gin & Tonic price $1", why: "Tonic supplier increase — margins need to absorb the cost shift." },
  ],
  estimated_roi: {
    time_saved_hours: 4.5,
    waste_reduced_usd: 480,
    stockouts_avoided_est: 2,
  },
};

export const demoAiMenuSuggestions = {
  suggestions: [
    {
      drink: "House Margarita",
      current_price: 12,
      suggested_price: 13,
      margin_impact_monthly: 284,
      rationale: "High-demand item with a 62.5% margin — below your cocktail average of 68%. A $1 increase is within the price range of comparable venues.",
      risk: "Low sensitivity expected — test on a Thursday before full rollout",
    },
    {
      drink: "Gin & Tonic",
      current_price: 12,
      suggested_price: 13,
      margin_impact_monthly: 196,
      rationale: "Tonic COGS increased 12% last month. Current margin is 51.7%. A $1 increase restores to target margin.",
      risk: "Monitor repeat orders after price change for 2 weeks",
    },
    {
      drink: "Draft IPA",
      current_price: 8,
      suggested_price: 9,
      margin_impact_monthly: 420,
      rationale: "Highest volume item (210/week). Even at $1 increase, still below most craft beer competitors. Strong demand elasticity.",
      risk: "Watch for volume drop in first 2 weeks post-change",
    },
  ],
};

export const demoAiShiftPush = {
  push_items: [
    {
      item: "Espresso Martini",
      why: "78.7% margin, steady demand after 9pm, and coffee suppliers fully stocked",
      script: "Our espresso martini is a crowd-pleaser tonight — made with cold brew. Want to start with one?",
      priority: "high",
    },
    {
      item: "Aperol Spritz",
      why: "70% margin and Aperol stock is at par — good for the week",
      script: "If you're in the mood for something light and refreshing, our Aperol Spritz is excellent right now.",
      priority: "med",
    },
    {
      item: "Old Fashioned",
      why: "Jameson overstock from last order — push to bring balance back to par",
      script: "Our house Old Fashioned is a great choice tonight — smooth Jameson build with house-made bitters.",
      priority: "med",
    },
  ],
};

export const demoAiCountSchedule = {
  cadence: [
    {
      item: "Tito's Vodka 1.75L",
      recommended_frequency: "2x weekly",
      why: "High variance (23.2%), high volume, high dollar value",
      variance_score: 0.88,
    },
    {
      item: "Patrón Silver 750ml",
      recommended_frequency: "2x weekly",
      why: "Critical variance spike (30%) — requires close monitoring",
      variance_score: 0.92,
    },
    {
      item: "Fresh Lime Juice",
      recommended_frequency: "weekly",
      why: "Consistent over-usage pattern for 3 weeks",
      variance_score: 0.64,
    },
    {
      item: "Draft IPA Keg",
      recommended_frequency: "weekly",
      why: "High volume but moderate variance — weekly is sufficient",
      variance_score: 0.42,
    },
    {
      item: "Jameson 750ml",
      recommended_frequency: "weekly",
      why: "Medium variance last week — trending toward normal",
      variance_score: 0.38,
    },
    {
      item: "Hendrick's Gin 750ml",
      recommended_frequency: "biweekly",
      why: "Stable usage with no flags in 4 weeks",
      variance_score: 0.18,
    },
  ],
};

export const demoAiDataGap = {
  gaps: [
    {
      gap: "Missing vendor lead times on 6 items",
      why_it_matters: "Lead times directly improve order-timing accuracy and stockout predictions",
      expected_improvement: "Reduce projected stockouts by ~15%",
      how_to_collect: "Add lead_time_days field in each vendor item record under Ordering → Vendors",
      priority: "high",
    },
    {
      gap: "No ingredient costs updated in last 30 days",
      why_it_matters: "Profit margin calculations become stale — Gin & Tonic is likely showing a higher margin than reality",
      expected_improvement: "Margin accuracy improvement of +8%",
      how_to_collect: "Upload latest supplier invoices or manually update cost_per_oz in Inventory → Ingredients",
      priority: "high",
    },
    {
      gap: "No drink specs for Gin & Tonic, Moscow Mule",
      why_it_matters: "Without specs, AI cannot detect over-pouring or variance tied to recipe drift",
      expected_improvement: "Enable variance explanation for 2 additional menu items",
      how_to_collect: "Add spec cards under Profit → New Drink Spec",
      priority: "med",
    },
  ],
};
