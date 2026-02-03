const dayMs = 24 * 60 * 60 * 1000;

export const DEMO_EMAIL = "mitchellskarangekis@gmail.com";
export const DEMO_TENANT_ID = "demo-tenant-001";
export const DEMO_LOCATION_ID = "demo-location-001";
export const DEMO_VENDOR_ID = "demo-vendor-001";

export const isDemoEmail = (email?: string | null) =>
  Boolean(email) && email?.toLowerCase() === DEMO_EMAIL;

export const demoLocation = {
  id: DEMO_LOCATION_ID,
  name: "Mitchell's Cocktail Bar - Midtown",
};

export const demoIngredients = [
  { id: "demo-ing-1", name: "Tito's Vodka", type: "spirit" },
  { id: "demo-ing-2", name: "Jameson Irish Whiskey", type: "spirit" },
  { id: "demo-ing-3", name: "Patron Silver Tequila", type: "spirit" },
  { id: "demo-ing-4", name: "Cointreau", type: "liqueur" },
  { id: "demo-ing-5", name: "Fresh Lime Juice", type: "mixer" },
  { id: "demo-ing-6", name: "Simple Syrup", type: "mixer" },
  { id: "demo-ing-7", name: "Angostura Bitters", type: "other" },
  { id: "demo-ing-8", name: "Draft IPA", type: "beer" },
  { id: "demo-ing-9", name: "House Red Wine", type: "wine" },
  { id: "demo-ing-10", name: "Espresso Beans", type: "other" },
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
    name: "Patron Silver 750ml",
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
];

export const demoMenuItems = [
  { id: "demo-menu-1", name: "House Margarita", base_price: 12 },
  { id: "demo-menu-2", name: "Old Fashioned", base_price: 14 },
  { id: "demo-menu-3", name: "Moscow Mule", base_price: 13 },
  { id: "demo-menu-4", name: "Espresso Martini", base_price: 15 },
  { id: "demo-menu-5", name: "Draft IPA", base_price: 8 },
  { id: "demo-menu-6", name: "Negroni", base_price: 14 },
];

const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * dayMs).toISOString().slice(0, 10);

export const demoVarianceFlags = [
  {
    id: "demo-flag-1",
    week_start_date: isoDate(-7),
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
    week_start_date: isoDate(-7),
    inventory_item_id: "demo-item-3",
    expected_remaining_oz: "12.0",
    actual_remaining_oz: "8.4",
    variance_oz: "-3.6",
    variance_pct: "-30.0",
    severity: "high",
    location_id: DEMO_LOCATION_ID,
    item_name: "Patron Silver 750ml",
  },
  {
    id: "demo-flag-3",
    week_start_date: isoDate(-7),
    inventory_item_id: "demo-item-5",
    expected_remaining_oz: "18.0",
    actual_remaining_oz: "14.5",
    variance_oz: "-3.5",
    variance_pct: "-19.4",
    severity: "med",
    location_id: DEMO_LOCATION_ID,
    item_name: "Fresh Lime Juice",
  },
];

export const demoForecast = Array.from({ length: 14 }, (_, index) => ({
  forecast_date: isoDate(index),
  inventory_item_id: "demo-item-1",
  forecast_usage_oz: 18 + (index % 5) * 2,
  location_id: DEMO_LOCATION_ID,
}));

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
        item_name: "Patron Silver 750ml",
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
    recommendations: ["Promote top performer"],
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
    recommendations: ["Promote top performer"],
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
    recommendations: ["Raise price $1-$2 test", "Tighten spec by 0.25 oz"],
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
    recommendations: ["Monitor performance"],
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
    "Draft orders are ready for two vendors. Focus on spirits this week and lock lime/syrup restocks for weekend demand.",
  top_actions: [
    {
      action: "Approve Metro Spirits draft ($312 total)",
      reason: "Projected vodka/tequila depletion by Friday night",
      urgency: "high",
    },
    {
      action: "Approve Fresh Mixers draft ($72 total)",
      reason: "Lime juice and syrup trending below par by Saturday",
      urgency: "med",
    },
  ],
  risk_notes: [
    {
      risk: "Tequila stockout risk",
      impact: "Potential loss of 14-18 Margarita sales",
    },
  ],
  confidence: 0.82,
};

export const demoAiVarianceExplain = {
  findings: [
    {
      item: "Tito's Vodka 1.75L",
      variance_pct: -23.2,
      hypotheses: [
        "Over-pouring on high volume nights",
        "Unrecorded comps during happy hour",
      ],
      recommended_checks: [
        "Review pour training for Friday/Saturday shifts",
        "Verify happy hour comps logged in POS",
      ],
      severity: "high",
    },
    {
      item: "Fresh Lime Juice",
      variance_pct: -19.4,
      hypotheses: ["Batch prep loss", "Waste during peak service"],
      recommended_checks: [
        "Confirm batch yields vs recipe",
        "Track waste bin during service",
      ],
      severity: "med",
    },
  ],
  non_accusatory_note:
    "These are possible operational causes. Please investigate before drawing conclusions.",
};

export const demoAiWeeklyBrief = {
  week_range: "Last 7 days",
  wins: [
    {
      title: "Margin lift on cocktails",
      detail: "Top 5 cocktails averaged +4.2% margin vs prior week.",
    },
    {
      title: "Lowered draft waste",
      detail: "Draft variance improved by 12% after keg rotation changes.",
    },
  ],
  watchouts: [
    {
      title: "Tequila variance spike",
      detail: "Patron Silver variance at -30% for the week.",
    },
    {
      title: "Lime juice shrink",
      detail: "Usage exceeds expected by 3.5 oz/day.",
    },
  ],
  next_actions: [
    { action: "Audit Margarita specs", why: "High volume and variance risk." },
    { action: "Schedule quick count on spirits", why: "Reduce end-week surprises." },
  ],
  estimated_roi: {
    time_saved_hours: 3.5,
    waste_reduced_usd: 420,
    stockouts_avoided_est: 2,
  },
};

export const demoAiMenuSuggestions = {
  suggestions: [
    {
      drink: "House Margarita",
      current_price: 12,
      suggested_price: 13,
      margin_impact_monthly: 280,
      rationale: "High demand item with room to raise price",
      risk: "Low price sensitivity expected",
    },
    {
      drink: "Draft IPA",
      current_price: 8,
      suggested_price: 9,
      margin_impact_monthly: 190,
      rationale: "Strong weekend velocity; pricing aligned to competitors",
      risk: "Monitor repeat rate after change",
    },
  ],
};

export const demoAiShiftPush = {
  push_items: [
    {
      item: "Espresso Martini",
      why: "High margin and steady demand after 9pm",
      script: "Our espresso martini is a crowd favorite tonight. Want to start with one?",
      priority: "high",
    },
    {
      item: "Negroni",
      why: "Overstocked gin and vermouth",
      script: "If you like a bold classic, our Negroni is excellent this evening.",
      priority: "med",
    },
  ],
};

export const demoAiCountSchedule = {
  cadence: [
    {
      item: "Tito's Vodka 1.75L",
      recommended_frequency: "weekly",
      why: "High variance and high volume",
      variance_score: 0.78,
    },
    {
      item: "Patron Silver 750ml",
      recommended_frequency: "weekly",
      why: "Variance spike this week",
      variance_score: 0.81,
    },
    {
      item: "Draft IPA Keg",
      recommended_frequency: "biweekly",
      why: "Stable usage with moderate variance",
      variance_score: 0.42,
    },
  ],
};

export const demoAiDataGap = {
  gaps: [
    {
      gap: "Missing vendor lead times on 4 items",
      why_it_matters: "Lead times improve ordering accuracy",
      expected_improvement: "Reduce stockouts by ~10%",
      how_to_collect: "Add lead time days in vendor items",
      priority: "high",
    },
    {
      gap: "No cost updates in last 30 days",
      why_it_matters: "Profitability estimates may be stale",
      expected_improvement: "Margin tracking accuracy +6%",
      how_to_collect: "Upload latest invoices or update costs",
      priority: "med",
    },
  ],
};
