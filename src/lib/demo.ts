/**
 * Demo data for demo@pourdex.com
 *
 * Represents "Mitchell's Cocktail Bar — Midtown Nashville" — a realistic
 * mid-volume bar doing ~$42k/month in revenue with a full spirits menu,
 * two kegs, wine, and a mix of well-performing and problem items.
 *
 * Market tier: Nashville = mid-tier ($13 cocktail benchmark)
 */

const dayMs = 24 * 60 * 60 * 1000;

export const DEMO_EMAIL = "demo@pourdex.com";
export const DEMO_TENANT_ID = "demo-tenant-001";
export const DEMO_LOCATION_ID = "demo-location-001";
export const DEMO_VENDOR_ID = "demo-vendor-001";

export const isDemoEmail = (email?: string | null) =>
  Boolean(email) && email?.toLowerCase() === DEMO_EMAIL;

export const demoLocation = {
  id: DEMO_LOCATION_ID,
  name: "Mitchell's Cocktail Bar — Midtown Nashville",
};

// ── Ingredients (28 items) ────────────────────────────────────────────────────
export const demoIngredients = [
  { id: "demo-ing-1",  name: "Tito's Handmade Vodka",     type: "spirit"  },
  { id: "demo-ing-2",  name: "Jameson Irish Whiskey",      type: "spirit"  },
  { id: "demo-ing-3",  name: "Patrón Silver Tequila",      type: "spirit"  },
  { id: "demo-ing-4",  name: "Cointreau",                  type: "liqueur" },
  { id: "demo-ing-5",  name: "Fresh Lime Juice",           type: "mixer"   },
  { id: "demo-ing-6",  name: "Simple Syrup",               type: "mixer"   },
  { id: "demo-ing-7",  name: "Angostura Bitters",          type: "other"   },
  { id: "demo-ing-8",  name: "Draft IPA",                  type: "beer"    },
  { id: "demo-ing-9",  name: "House Red Wine",             type: "wine"    },
  { id: "demo-ing-10", name: "Cold Brew Coffee",           type: "other"   },
  { id: "demo-ing-11", name: "Hendrick's Gin",             type: "spirit"  },
  { id: "demo-ing-12", name: "Aperol",                     type: "liqueur" },
  { id: "demo-ing-13", name: "Grey Goose Vodka",           type: "spirit"  },
  { id: "demo-ing-14", name: "Maker's Mark Bourbon",       type: "spirit"  },
  { id: "demo-ing-15", name: "Bacardi White Rum",          type: "spirit"  },
  { id: "demo-ing-16", name: "Campari",                    type: "liqueur" },
  { id: "demo-ing-17", name: "Kahlúa",                     type: "liqueur" },
  { id: "demo-ing-18", name: "St-Germain Elderflower",     type: "liqueur" },
  { id: "demo-ing-19", name: "Ginger Beer",                type: "mixer"   },
  { id: "demo-ing-20", name: "Tonic Water",                type: "mixer"   },
  { id: "demo-ing-21", name: "Cranberry Juice",            type: "mixer"   },
  { id: "demo-ing-22", name: "Fresh Orange Juice",         type: "mixer"   },
  { id: "demo-ing-23", name: "Prosecco",                   type: "wine"    },
  { id: "demo-ing-24", name: "House White Wine",           type: "wine"    },
  { id: "demo-ing-25", name: "Grenadine",                  type: "mixer"   },
  { id: "demo-ing-26", name: "Draft Lager",                type: "beer"    },
  { id: "demo-ing-27", name: "Peach Schnapps",             type: "liqueur" },
  { id: "demo-ing-28", name: "Blue Curaçao",               type: "liqueur" },
];

// ── Inventory items (28 items) ────────────────────────────────────────────────
export const demoInventoryItems = [
  { id: "demo-item-1",  location_id: DEMO_LOCATION_ID, name: "Tito's Vodka 1.75L",          container_type: "bottle", container_size_oz: 59.2 },
  { id: "demo-item-2",  location_id: DEMO_LOCATION_ID, name: "Jameson 750ml",                container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-3",  location_id: DEMO_LOCATION_ID, name: "Patrón Silver 750ml",          container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-4",  location_id: DEMO_LOCATION_ID, name: "Cointreau 750ml",              container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-5",  location_id: DEMO_LOCATION_ID, name: "Fresh Lime Juice (32oz)",      container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-6",  location_id: DEMO_LOCATION_ID, name: "Simple Syrup (32oz)",          container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-7",  location_id: DEMO_LOCATION_ID, name: "Angostura Bitters",            container_type: "bottle", container_size_oz: 5    },
  { id: "demo-item-8",  location_id: DEMO_LOCATION_ID, name: "Draft IPA Half Keg",           container_type: "keg",    container_size_oz: 1984 },
  { id: "demo-item-9",  location_id: DEMO_LOCATION_ID, name: "Hendrick's Gin 750ml",         container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-10", location_id: DEMO_LOCATION_ID, name: "Aperol 750ml",                 container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-11", location_id: DEMO_LOCATION_ID, name: "Grey Goose 750ml",             container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-12", location_id: DEMO_LOCATION_ID, name: "Maker's Mark 750ml",           container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-13", location_id: DEMO_LOCATION_ID, name: "Bacardi White 1.75L",          container_type: "bottle", container_size_oz: 59.2 },
  { id: "demo-item-14", location_id: DEMO_LOCATION_ID, name: "Campari 750ml",                container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-15", location_id: DEMO_LOCATION_ID, name: "Kahlúa 750ml",                 container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-16", location_id: DEMO_LOCATION_ID, name: "St-Germain 750ml",             container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-17", location_id: DEMO_LOCATION_ID, name: "Ginger Beer (case/24)",        container_type: "case",   container_size_oz: 288  },
  { id: "demo-item-18", location_id: DEMO_LOCATION_ID, name: "Tonic Water (case/24)",        container_type: "case",   container_size_oz: 288  },
  { id: "demo-item-19", location_id: DEMO_LOCATION_ID, name: "Cranberry Juice (32oz)",       container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-20", location_id: DEMO_LOCATION_ID, name: "Fresh Orange Juice (32oz)",    container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-21", location_id: DEMO_LOCATION_ID, name: "Prosecco (case/6)",            container_type: "case",   container_size_oz: 152.4 },
  { id: "demo-item-22", location_id: DEMO_LOCATION_ID, name: "House White Wine (3L bag)",    container_type: "other",  container_size_oz: 101.4 },
  { id: "demo-item-23", location_id: DEMO_LOCATION_ID, name: "House Red Wine (3L bag)",      container_type: "other",  container_size_oz: 101.4 },
  { id: "demo-item-24", location_id: DEMO_LOCATION_ID, name: "Draft Lager Half Keg",         container_type: "keg",    container_size_oz: 1984 },
  { id: "demo-item-25", location_id: DEMO_LOCATION_ID, name: "Grenadine (32oz)",             container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-26", location_id: DEMO_LOCATION_ID, name: "Peach Schnapps 750ml",         container_type: "bottle", container_size_oz: 25.4 },
  { id: "demo-item-27", location_id: DEMO_LOCATION_ID, name: "Cold Brew Coffee (32oz)",      container_type: "bottle", container_size_oz: 32   },
  { id: "demo-item-28", location_id: DEMO_LOCATION_ID, name: "Bombay Sapphire 750ml",        container_type: "bottle", container_size_oz: 25.4 },
];

// ── Menu items (22 items — includes 2 dead SKUs) ──────────────────────────────
export const demoMenuItems = [
  { id: "demo-menu-1",  name: "House Margarita",           base_price: 12,  category: "cocktail" },
  { id: "demo-menu-2",  name: "Old Fashioned",             base_price: 14,  category: "cocktail" },
  { id: "demo-menu-3",  name: "Moscow Mule",               base_price: 13,  category: "cocktail" },
  { id: "demo-menu-4",  name: "Espresso Martini",          base_price: 15,  category: "cocktail" },
  { id: "demo-menu-5",  name: "Draft IPA",                 base_price: 8,   category: "beer"     },
  { id: "demo-menu-6",  name: "Negroni",                   base_price: 14,  category: "cocktail" },
  { id: "demo-menu-7",  name: "Aperol Spritz",             base_price: 13,  category: "cocktail" },
  { id: "demo-menu-8",  name: "Gin & Tonic",               base_price: 12,  category: "cocktail" },
  { id: "demo-menu-9",  name: "Whiskey Sour",              base_price: 13,  category: "cocktail" },
  { id: "demo-menu-10", name: "Cosmopolitan",              base_price: 13,  category: "cocktail" },
  { id: "demo-menu-11", name: "Paloma",                    base_price: 13,  category: "cocktail" },
  { id: "demo-menu-12", name: "Dark & Stormy",             base_price: 12,  category: "cocktail" },
  { id: "demo-menu-13", name: "Pornstar Martini",          base_price: 15,  category: "cocktail" },
  { id: "demo-menu-14", name: "Hugo Spritz",               base_price: 14,  category: "cocktail" },
  { id: "demo-menu-15", name: "House Red Wine",            base_price: 11,  category: "wine"     },
  { id: "demo-menu-16", name: "House White Wine",          base_price: 11,  category: "wine"     },
  { id: "demo-menu-17", name: "Prosecco Glass",            base_price: 12,  category: "wine"     },
  { id: "demo-menu-18", name: "Draft Lager",               base_price: 7,   category: "beer"     },
  { id: "demo-menu-19", name: "Grey Goose Martini",        base_price: 17,  category: "cocktail" },
  { id: "demo-menu-20", name: "Peach Bellini",             base_price: 13,  category: "cocktail" },
  // Dead SKUs — kept for demo dead-sku detection
  { id: "demo-menu-21", name: "Pumpkin Spice Mule",        base_price: 13,  category: "cocktail" },
  { id: "demo-menu-22", name: "Lavender Collins",          base_price: 13,  category: "cocktail" },
];

const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * dayMs).toISOString().slice(0, 10);

const currentWeekStart  = isoDate(-7);
const prevWeekStart     = isoDate(-14);
const week3Start        = isoDate(-21);
const week4Start        = isoDate(-28);
const week5Start        = isoDate(-35);
const week6Start        = isoDate(-42);
const week7Start        = isoDate(-49);
const week8Start        = isoDate(-56);

// ── Variance flags (rich — 8 weeks of history) ───────────────────────────────
// Dollar values based on ~$0.85/oz Tito's, ~$1.40/oz Patrón, ~$0.19/oz lime
export const demoVarianceFlags = [
  // ── This week ──
  { id: "df-1",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-1",  expected_remaining_oz: "28.0",  actual_remaining_oz: "21.5", variance_oz: "-6.5", variance_pct: "-23.2", severity: "high", location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 5.53  },
  { id: "df-2",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-3",  expected_remaining_oz: "12.0",  actual_remaining_oz: "8.4",  variance_oz: "-3.6", variance_pct: "-30.0", severity: "high", location_id: DEMO_LOCATION_ID, item_name: "Patrón Silver 750ml",      cost_per_oz: 1.40, unaccounted_cost_usd: 5.04  },
  { id: "df-3",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-5",  expected_remaining_oz: "18.0",  actual_remaining_oz: "14.5", variance_oz: "-3.5", variance_pct: "-19.4", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Fresh Lime Juice",          cost_per_oz: 0.19, unaccounted_cost_usd: 0.67  },
  { id: "df-4",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-8",  expected_remaining_oz: "142.0", actual_remaining_oz: "133.1",variance_oz: "-8.9", variance_pct: "-6.3",  severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Draft IPA Half Keg",       cost_per_oz: 0.05, unaccounted_cost_usd: 0.45  },
  { id: "df-5",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-4",  expected_remaining_oz: "20.5",  actual_remaining_oz: "18.7", variance_oz: "-1.8", variance_pct: "-8.8",  severity: "low", location_id: DEMO_LOCATION_ID, item_name: "Cointreau 750ml",          cost_per_oz: 0.79, unaccounted_cost_usd: 1.42  },
  { id: "df-6",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-12", expected_remaining_oz: "19.0",  actual_remaining_oz: "15.8", variance_oz: "-3.2", variance_pct: "-16.8", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Maker's Mark 750ml",       cost_per_oz: 1.10, unaccounted_cost_usd: 3.52  },
  { id: "df-7",  week_start_date: currentWeekStart, inventory_item_id: "demo-item-17", expected_remaining_oz: "96.0",  actual_remaining_oz: "80.2", variance_oz: "-15.8",variance_pct: "-16.5", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Ginger Beer (case)",        cost_per_oz: 0.10, unaccounted_cost_usd: 1.58  },
  // ── Week 2 ──
  { id: "df-8",  week_start_date: prevWeekStart,    inventory_item_id: "demo-item-2",  expected_remaining_oz: "22.0",  actual_remaining_oz: "17.8", variance_oz: "-4.2", variance_pct: "-19.1", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Jameson 750ml",            cost_per_oz: 0.95, unaccounted_cost_usd: 3.99  },
  { id: "df-9",  week_start_date: prevWeekStart,    inventory_item_id: "demo-item-1",  expected_remaining_oz: "30.0",  actual_remaining_oz: "22.2", variance_oz: "-7.8", variance_pct: "-26.0", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 6.63  },
  { id: "df-10", week_start_date: prevWeekStart,    inventory_item_id: "demo-item-3",  expected_remaining_oz: "14.0",  actual_remaining_oz: "9.5",  variance_oz: "-4.5", variance_pct: "-32.1", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Patrón Silver 750ml",      cost_per_oz: 1.40, unaccounted_cost_usd: 6.30  },
  { id: "df-11", week_start_date: prevWeekStart,    inventory_item_id: "demo-item-6",  expected_remaining_oz: "24.0",  actual_remaining_oz: "21.4", variance_oz: "-2.6", variance_pct: "-10.8", severity: "low", location_id: DEMO_LOCATION_ID, item_name: "Simple Syrup",             cost_per_oz: 0.13, unaccounted_cost_usd: 0.34  },
  { id: "df-12", week_start_date: prevWeekStart,    inventory_item_id: "demo-item-12", expected_remaining_oz: "21.0",  actual_remaining_oz: "16.1", variance_oz: "-4.9", variance_pct: "-23.3", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Maker's Mark 750ml",       cost_per_oz: 1.10, unaccounted_cost_usd: 5.39  },
  // ── Week 3 ──
  { id: "df-13", week_start_date: week3Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "29.0",  actual_remaining_oz: "20.8", variance_oz: "-8.2", variance_pct: "-28.3", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 6.97  },
  { id: "df-14", week_start_date: week3Start,       inventory_item_id: "demo-item-3",  expected_remaining_oz: "13.0",  actual_remaining_oz: "9.8",  variance_oz: "-3.2", variance_pct: "-24.6", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Patrón Silver 750ml",      cost_per_oz: 1.40, unaccounted_cost_usd: 4.48  },
  { id: "df-15", week_start_date: week3Start,       inventory_item_id: "demo-item-5",  expected_remaining_oz: "20.0",  actual_remaining_oz: "16.1", variance_oz: "-3.9", variance_pct: "-19.5", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Fresh Lime Juice",          cost_per_oz: 0.19, unaccounted_cost_usd: 0.74  },
  { id: "df-16", week_start_date: week3Start,       inventory_item_id: "demo-item-11", expected_remaining_oz: "18.0",  actual_remaining_oz: "14.2", variance_oz: "-3.8", variance_pct: "-21.1", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Grey Goose 750ml",         cost_per_oz: 1.60, unaccounted_cost_usd: 6.08  },
  // ── Week 4 ──
  { id: "df-17", week_start_date: week4Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "32.0",  actual_remaining_oz: "25.4", variance_oz: "-6.6", variance_pct: "-20.6", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 5.61  },
  { id: "df-18", week_start_date: week4Start,       inventory_item_id: "demo-item-2",  expected_remaining_oz: "20.0",  actual_remaining_oz: "17.5", variance_oz: "-2.5", variance_pct: "-12.5", severity: "low", location_id: DEMO_LOCATION_ID, item_name: "Jameson 750ml",            cost_per_oz: 0.95, unaccounted_cost_usd: 2.38  },
  { id: "df-19", week_start_date: week4Start,       inventory_item_id: "demo-item-12", expected_remaining_oz: "20.0",  actual_remaining_oz: "14.6", variance_oz: "-5.4", variance_pct: "-27.0", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Maker's Mark 750ml",       cost_per_oz: 1.10, unaccounted_cost_usd: 5.94  },
  // ── Week 5 ──
  { id: "df-20", week_start_date: week5Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "28.0",  actual_remaining_oz: "23.8", variance_oz: "-4.2", variance_pct: "-15.0", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 3.57  },
  { id: "df-21", week_start_date: week5Start,       inventory_item_id: "demo-item-3",  expected_remaining_oz: "15.0",  actual_remaining_oz: "11.2", variance_oz: "-3.8", variance_pct: "-25.3", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Patrón Silver 750ml",      cost_per_oz: 1.40, unaccounted_cost_usd: 5.32  },
  // ── Weeks 6–8 (older, fewer flags — shows improving trend on some items) ──
  { id: "df-22", week_start_date: week6Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "31.0",  actual_remaining_oz: "24.8", variance_oz: "-6.2", variance_pct: "-20.0", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 5.27  },
  { id: "df-23", week_start_date: week7Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "29.0",  actual_remaining_oz: "22.9", variance_oz: "-6.1", variance_pct: "-21.0", severity: "high",location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 5.19  },
  { id: "df-24", week_start_date: week8Start,       inventory_item_id: "demo-item-1",  expected_remaining_oz: "30.0",  actual_remaining_oz: "26.4", variance_oz: "-3.6", variance_pct: "-12.0", severity: "med", location_id: DEMO_LOCATION_ID, item_name: "Tito's Vodka 1.75L",       cost_per_oz: 0.85, unaccounted_cost_usd: 3.06  },
];

// ── Forecast (6 items × 14 days) ──────────────────────────────────────────────
const forecastItems = [
  { id: "demo-item-1",  name: "Tito's Vodka 1.75L",    baseOz: 22, amplitude: 4  },
  { id: "demo-item-3",  name: "Patrón Silver 750ml",    baseOz: 11, amplitude: 2  },
  { id: "demo-item-8",  name: "Draft IPA Half Keg",     baseOz: 62, amplitude: 18 },
  { id: "demo-item-5",  name: "Fresh Lime Juice",       baseOz: 16, amplitude: 3  },
  { id: "demo-item-12", name: "Maker's Mark 750ml",     baseOz: 14, amplitude: 3  },
  { id: "demo-item-24", name: "Draft Lager Half Keg",   baseOz: 44, amplitude: 14 },
];

export const demoForecast = forecastItems.flatMap(({ id, baseOz, amplitude }) =>
  Array.from({ length: 14 }, (_, i) => ({
    forecast_date: isoDate(i),
    inventory_item_id: id,
    forecast_usage_oz: Math.round(
      (baseOz + (i % 7 >= 5 ? amplitude : Math.floor(amplitude * 0.4))) * 10,
    ) / 10,
    location_id: DEMO_LOCATION_ID,
  })),
);

// ── Analytics overview ────────────────────────────────────────────────────────
export const demoAnalyticsOverview = {
  forecastByDay: Array.from({ length: 14 }, (_, i) => {
    const weekendBoost = i % 7 >= 5 ? 45 : 0;
    return { date: isoDate(i), total_usage_oz: 138 + weekendBoost + (i % 3) * 5 };
  }),
  varianceByWeek: [
    { week_start_date: isoDate(-56), total_abs_variance_oz: 22.4, flag_count: 4, total_unaccounted_usd: 18.9  },
    { week_start_date: isoDate(-49), total_abs_variance_oz: 29.8, flag_count: 6, total_unaccounted_usd: 25.3  },
    { week_start_date: isoDate(-42), total_abs_variance_oz: 34.8, flag_count: 7, total_unaccounted_usd: 29.6  },
    { week_start_date: isoDate(-35), total_abs_variance_oz: 31.4, flag_count: 6, total_unaccounted_usd: 26.7  },
    { week_start_date: isoDate(-28), total_abs_variance_oz: 28.8, flag_count: 6, total_unaccounted_usd: 24.5  },
    { week_start_date: isoDate(-21), total_abs_variance_oz: 33.2, flag_count: 7, total_unaccounted_usd: 28.2  },
    { week_start_date: isoDate(-14), total_abs_variance_oz: 29.4, flag_count: 6, total_unaccounted_usd: 24.9  },
    { week_start_date: isoDate(-7),  total_abs_variance_oz: 31.8, flag_count: 7, total_unaccounted_usd: 27.0  },
  ],
  topForecastItems: [
    { inventory_item_id: "demo-item-8",  item_name: "Draft IPA Half Keg",   total_usage_oz: 868  },
    { inventory_item_id: "demo-item-24", item_name: "Draft Lager Half Keg", total_usage_oz: 616  },
    { inventory_item_id: "demo-item-1",  item_name: "Tito's Vodka 1.75L",   total_usage_oz: 308  },
    { inventory_item_id: "demo-item-5",  item_name: "Fresh Lime Juice",     total_usage_oz: 224  },
    { inventory_item_id: "demo-item-3",  item_name: "Patrón Silver 750ml",  total_usage_oz: 154  },
    { inventory_item_id: "demo-item-12", item_name: "Maker's Mark 750ml",   total_usage_oz: 196  },
  ],
  stockoutRisk: [
    { inventory_item_id: "demo-item-1",  item_name: "Tito's Vodka 1.75L",  forecast_next_14d_oz: 308 },
    { inventory_item_id: "demo-item-3",  item_name: "Patrón Silver 750ml", forecast_next_14d_oz: 154 },
    { inventory_item_id: "demo-item-5",  item_name: "Fresh Lime Juice",    forecast_next_14d_oz: 224 },
  ],
};

// ── Need vs on-hand ───────────────────────────────────────────────────────────
export const demoNeedVsOnhand = {
  snapshotDate: isoDate(-1),
  items: [
    { inventory_item_id: "demo-item-1",  item_name: "Tito's Vodka 1.75L",   on_hand_oz: 118.4,  forecast_next_14d_oz: 308.0 },
    { inventory_item_id: "demo-item-8",  item_name: "Draft IPA Half Keg",   on_hand_oz: 992.0,  forecast_next_14d_oz: 868.0 },
    { inventory_item_id: "demo-item-24", item_name: "Draft Lager Half Keg", on_hand_oz: 744.0,  forecast_next_14d_oz: 616.0 },
    { inventory_item_id: "demo-item-3",  item_name: "Patrón Silver 750ml",  on_hand_oz: 50.8,   forecast_next_14d_oz: 154.0 },
    { inventory_item_id: "demo-item-5",  item_name: "Fresh Lime Juice",     on_hand_oz: 64.0,   forecast_next_14d_oz: 224.0 },
    { inventory_item_id: "demo-item-2",  item_name: "Jameson 750ml",        on_hand_oz: 76.2,   forecast_next_14d_oz: 112.0 },
    { inventory_item_id: "demo-item-12", item_name: "Maker's Mark 750ml",   on_hand_oz: 38.1,   forecast_next_14d_oz: 196.0 },
    { inventory_item_id: "demo-item-9",  item_name: "Hendrick's Gin 750ml", on_hand_oz: 50.8,   forecast_next_14d_oz: 56.0  },
    { inventory_item_id: "demo-item-6",  item_name: "Simple Syrup",         on_hand_oz: 96.0,   forecast_next_14d_oz: 84.0  },
    { inventory_item_id: "demo-item-4",  item_name: "Cointreau 750ml",      on_hand_oz: 50.8,   forecast_next_14d_oz: 42.0  },
  ],
};

// ── Shrinkage clusters ────────────────────────────────────────────────────────
export const demoShrinkageClusters = {
  clusters: [
    {
      cluster_id: "spirits-over-pour",
      label: "Spirits Over-Pour Group",
      type: "pour_variance" as const,
      items: ["Tito's Vodka 1.75L", "Jameson 750ml"],
      total_shrinkage_usd: 218,
      avg_z_score: 2.3,
      description: "High-volume spirits showing consistent unaccounted usage, particularly on Friday and Saturday shifts. Pattern matches free-pouring instead of using a jigger.",
      recommended_action: "Enforce jigger use on all spirit pours. Run a 5-minute pour-accuracy drill with Friday and Saturday staff before service this week.",
      urgency: "high" as const,
    },
    {
      cluster_id: "premium-leakage",
      label: "Premium Spirits — Unaccounted Pours",
      type: "theft_pattern" as const,
      items: ["Patrón Silver 750ml", "Grey Goose 750ml", "Maker's Mark 750ml"],
      total_shrinkage_usd: 156,
      avg_z_score: 2.8,
      description: "Premium spirits losing 20–30% per week with no matching transaction records. Unaccounted usage outside peak service hours is a pattern worth investigating.",
      recommended_action: "Review who has access to the premium well after service. Check transaction records for Thursday–Friday 10pm–2am. Compare against comp and void logs.",
      urgency: "high" as const,
    },
    {
      cluster_id: "prep-waste-loop",
      label: "Mixer Prep Waste",
      type: "waste" as const,
      items: ["Fresh Lime Juice", "Simple Syrup", "Ginger Beer"],
      total_shrinkage_usd: 48,
      avg_z_score: 1.4,
      description: "Mixers running 15–20% over expected usage vs cocktail sales. Most likely from batch prep loss and inconsistent recipe adherence during a busy service.",
      recommended_action: "Measure and log batch prep yields. Brief bartenders on standard lime and syrup ratios. Track prep waste in the inventory count sheet.",
      urgency: "med" as const,
    },
    {
      cluster_id: "measurement-noise",
      label: "Minor Measurement Differences",
      type: "data_quality" as const,
      items: ["Angostura Bitters", "Grenadine"],
      total_shrinkage_usd: 6,
      avg_z_score: 0.7,
      description: "Very small dollar differences — likely from counting approximation, not actual loss. Within normal tolerance.",
      recommended_action: "No action needed. Standardize how bitters and grenadine are counted (use a consistent measurement point on the bottle).",
      urgency: "low" as const,
    },
  ],
};

// ── Audit logs (25 entries) ───────────────────────────────────────────────────
const userId = "demo-user-001";
const auditEntry = (
  id: string, action: string, entityType: string, entityId: string | null,
  details: Record<string, unknown>, offsetDays: number, offsetHours = 0,
) => ({
  id, action, entity_type: entityType, entity_id: entityId, details,
  location_id: DEMO_LOCATION_ID, user_id: userId,
  created_at: new Date(Date.now() + offsetDays * dayMs + offsetHours * 3600 * 1000).toISOString(),
  user_profiles: { email: DEMO_EMAIL },
});

export const demoAuditLogs = {
  logs: [
    auditEntry("al-1",  "ordering.approved",           "purchase_orders",      "demo-po-1", { vendor: "Metro Spirits Supply", total: 468   }, -1, 14),
    auditEntry("al-2",  "ordering.sent",               "purchase_orders",      "demo-po-1", { vendor: "Metro Spirits Supply", email: "orders@metrosupply.com" }, -1, 14),
    auditEntry("al-3",  "inventory.snapshot",          "inventory_snapshots",  "snap-04-09",{ item_count: 22, counted_by: DEMO_EMAIL       }, -1, 9 ),
    auditEntry("al-4",  "variance.flagged",            "variance_flags",       "df-1",      { item: "Tito's Vodka 1.75L",    unaccounted_usd: 5.53, severity: "high" }, -1, 7),
    auditEntry("al-5",  "variance.flagged",            "variance_flags",       "df-2",      { item: "Patrón Silver 750ml",   unaccounted_usd: 5.04, severity: "high" }, -1, 7),
    auditEntry("al-6",  "variance.flagged",            "variance_flags",       "df-6",      { item: "Maker's Mark 750ml",   unaccounted_usd: 3.52, severity: "med"  }, -1, 7),
    auditEntry("al-7",  "ingest.completed",            "pos_import_runs",      "demo-run-1",{ rows_imported: 1042, source: "csv"             }, -2, 11),
    auditEntry("al-8",  "ordering.draft_created",      "purchase_orders",      "demo-po-2", { vendor: "Nashville Mixers Co.", lines: 4     }, -3, 15),
    auditEntry("al-9",  "ordering.draft_created",      "purchase_orders",      "demo-po-1", { vendor: "Metro Spirits Supply", lines: 5     }, -3, 14),
    auditEntry("al-10", "inventory.snapshot",          "inventory_snapshots",  "snap-04-06",{ item_count: 22, counted_by: DEMO_EMAIL       }, -4, 9 ),
    auditEntry("al-11", "ingest.completed",            "pos_import_runs",      "demo-run-2",{ rows_imported: 978, source: "csv"              }, -5, 10),
    auditEntry("al-12", "variance.flagged",            "variance_flags",       "df-9",      { item: "Tito's Vodka 1.75L",    unaccounted_usd: 6.63, severity: "high" }, -7, 7),
    auditEntry("al-13", "variance.flagged",            "variance_flags",       "df-10",     { item: "Patrón Silver 750ml",   unaccounted_usd: 6.30, severity: "high" }, -7, 7),
    auditEntry("al-14", "variance.flagged",            "variance_flags",       "df-12",     { item: "Maker's Mark 750ml",   unaccounted_usd: 5.39, severity: "high" }, -7, 7),
    auditEntry("al-15", "ingest.warning",              "pos_import_runs",      "demo-run-3",{ rows_skipped: 3, reason: "missing SKU"         }, -9, 13),
    auditEntry("al-16", "inventory.snapshot",          "inventory_snapshots",  "snap-04-02",{ item_count: 22, counted_by: DEMO_EMAIL       }, -8, 9 ),
    auditEntry("al-17", "ordering.approved",           "purchase_orders",      "demo-po-3", { vendor: "Nashville Mixers Co.", total: 112   }, -10, 16),
    auditEntry("al-18", "ingest.completed",            "pos_import_runs",      "demo-run-3",{ rows_imported: 856, source: "csv"              }, -9, 12),
    auditEntry("al-19", "variance.flagged",            "variance_flags",       "df-19",     { item: "Maker's Mark 750ml",   unaccounted_usd: 5.94, severity: "high" }, -14, 7),
    auditEntry("al-20", "inventory.snapshot",          "inventory_snapshots",  "snap-03-27",{ item_count: 22, counted_by: DEMO_EMAIL       }, -11, 9 ),
    auditEntry("al-21", "settings.webhook_created",    "webhook_endpoints",    "wh-001",    { url: "https://hooks.slack.com/…", events: ["variance.high"] }, -12, 11),
    auditEntry("al-22", "settings.notifications_updated","user_notification_prefs",null,    { variance_alerts: true, weekly_digest: true   }, -14, 16),
    auditEntry("al-23", "ordering.approved",           "purchase_orders",      "demo-po-4", { vendor: "Metro Spirits Supply", total: 312   }, -14, 14),
    auditEntry("al-24", "inventory.snapshot",          "inventory_snapshots",  "snap-03-23",{ item_count: 22, counted_by: DEMO_EMAIL       }, -15, 9 ),
    auditEntry("al-25", "ingest.completed",            "pos_import_runs",      "demo-run-4",{ rows_imported: 1104, source: "csv"            }, -16, 10),
  ],
  total: 25,
};

export const demoNotificationPrefs = {
  variance_alerts: true,
  reorder_alerts: true,
  weekly_digest: true,
  digest_day: 1,
  alert_threshold: "med",
};

export const demoWebhookEndpoints = [
  { id: "wh-001", tenant_id: DEMO_TENANT_ID, url: "https://example.com/webhooks/pourdex-variance-alerts", events: ["variance.high", "ordering.draft_created"], is_active: true,  secret: null, created_at: new Date(Date.now() - 12 * dayMs).toISOString() },
  { id: "wh-002", tenant_id: DEMO_TENANT_ID, url: "https://your-pos-integration.example.com/webhooks/pourdex",              events: ["inventory.snapshot", "ingest.completed"],           is_active: false, secret: null, created_at: new Date(Date.now() - 5 * dayMs).toISOString()  },
];

// ── Purchase orders (5 orders, 3 vendors) ─────────────────────────────────────
export const demoPurchaseOrders = [
  {
    id: "demo-po-1",
    vendor_id: DEMO_VENDOR_ID,
    location_id: DEMO_LOCATION_ID,
    status: "draft",
    created_at: new Date(Date.now() - dayMs).toISOString(),
    vendor: { id: DEMO_VENDOR_ID, name: "Metro Spirits Supply", email: "orders@metrosupply.com" },
    lines: [
      { inventory_item_id: "demo-item-1",  item_name: "Tito's Vodka 1.75L",    qty_units: 6, unit_price: 28,  line_total: 168 },
      { inventory_item_id: "demo-item-3",  item_name: "Patrón Silver 750ml",   qty_units: 4, unit_price: 38,  line_total: 152 },
      { inventory_item_id: "demo-item-11", item_name: "Grey Goose 750ml",      qty_units: 3, unit_price: 42,  line_total: 126 },
      { inventory_item_id: "demo-item-12", item_name: "Maker's Mark 750ml",    qty_units: 4, unit_price: 28,  line_total: 112 },
      { inventory_item_id: "demo-item-2",  item_name: "Jameson 750ml",         qty_units: 3, unit_price: 26,  line_total: 78  },
    ],
  },
  {
    id: "demo-po-2",
    vendor_id: "demo-vendor-2",
    location_id: DEMO_LOCATION_ID,
    status: "draft",
    created_at: new Date(Date.now() - 3 * dayMs).toISOString(),
    vendor: { id: "demo-vendor-2", name: "Nashville Mixers Co.", email: "hello@nashvillemixers.com" },
    lines: [
      { inventory_item_id: "demo-item-5",  item_name: "Fresh Lime Juice (32oz)",   qty_units: 8,  unit_price: 6,   line_total: 48  },
      { inventory_item_id: "demo-item-6",  item_name: "Simple Syrup (32oz)",        qty_units: 6,  unit_price: 4,   line_total: 24  },
      { inventory_item_id: "demo-item-17", item_name: "Ginger Beer (case/24)",      qty_units: 3,  unit_price: 28,  line_total: 84  },
      { inventory_item_id: "demo-item-18", item_name: "Tonic Water (case/24)",      qty_units: 2,  unit_price: 24,  line_total: 48  },
    ],
  },
  {
    id: "demo-po-3",
    vendor_id: "demo-vendor-3",
    location_id: DEMO_LOCATION_ID,
    status: "approved",
    created_at: new Date(Date.now() - 10 * dayMs).toISOString(),
    vendor: { id: "demo-vendor-3", name: "Music City Beer Distributors", email: "orders@musiccitybeer.com" },
    lines: [
      { inventory_item_id: "demo-item-8",  item_name: "Draft IPA Half Keg",    qty_units: 1, unit_price: 148, line_total: 148 },
      { inventory_item_id: "demo-item-24", item_name: "Draft Lager Half Keg",  qty_units: 2, unit_price: 98,  line_total: 196 },
    ],
  },
  {
    id: "demo-po-4",
    vendor_id: DEMO_VENDOR_ID,
    location_id: DEMO_LOCATION_ID,
    status: "approved",
    created_at: new Date(Date.now() - 14 * dayMs).toISOString(),
    vendor: { id: DEMO_VENDOR_ID, name: "Metro Spirits Supply", email: "orders@metrosupply.com" },
    lines: [
      { inventory_item_id: "demo-item-1",  item_name: "Tito's Vodka 1.75L",    qty_units: 5, unit_price: 28,  line_total: 140 },
      { inventory_item_id: "demo-item-9",  item_name: "Hendrick's Gin 750ml",  qty_units: 3, unit_price: 38,  line_total: 114 },
      { inventory_item_id: "demo-item-13", item_name: "Bacardi White 1.75L",   qty_units: 3, unit_price: 26,  line_total: 78  },
    ],
  },
];

// ── Profit ranking (full menu — 20 items) ─────────────────────────────────────
export const demoProfitRanking = [
  { menu_item_id: "demo-menu-4",  name: "Espresso Martini",    qty_sold: 148, revenue: 2220, price_each: 15,  cost_per_serv: 3.2,  profit_per_serv: 11.80, margin_pct: 78.7, recommendations: ["Your top earner — make sure every bartender knows this spec cold"] },
  { menu_item_id: "demo-menu-19", name: "Grey Goose Martini",  qty_sold: 62,  revenue: 1054, price_each: 17,  cost_per_serv: 3.8,  profit_per_serv: 13.20, margin_pct: 77.6, recommendations: ["Strong margins — add to the upsell script for spirit-forward guests"] },
  { menu_item_id: "demo-menu-2",  name: "Old Fashioned",       qty_sold: 106, revenue: 1484, price_each: 14,  cost_per_serv: 3.6,  profit_per_serv: 10.40, margin_pct: 74.3, recommendations: ["Consistent performer — feature in staff training"] },
  { menu_item_id: "demo-menu-13", name: "Pornstar Martini",    qty_sold: 84,  revenue: 1260, price_each: 15,  cost_per_serv: 4.1,  profit_per_serv: 10.90, margin_pct: 72.7, recommendations: ["Growing fast — ensure Passoa stays in stock"] },
  { menu_item_id: "demo-menu-7",  name: "Aperol Spritz",       qty_sold: 112, revenue: 1456, price_each: 13,  cost_per_serv: 3.9,  profit_per_serv: 9.10,  margin_pct: 70.0, recommendations: ["Trending well — consider happy hour placement"] },
  { menu_item_id: "demo-menu-14", name: "Hugo Spritz",         qty_sold: 76,  revenue: 1064, price_each: 14,  cost_per_serv: 4.2,  profit_per_serv: 9.80,  margin_pct: 70.0, recommendations: ["Seasonal favourite — promote through summer"] },
  { menu_item_id: "demo-menu-5",  name: "Draft IPA",           qty_sold: 238, revenue: 1904, price_each: 8,   cost_per_serv: 2.6,  profit_per_serv: 5.40,  margin_pct: 67.5, recommendations: ["High volume — watch the keg closely. Consider a $1 price increase"] },
  { menu_item_id: "demo-menu-17", name: "Prosecco Glass",      qty_sold: 88,  revenue: 1056, price_each: 12,  cost_per_serv: 3.9,  profit_per_serv: 8.10,  margin_pct: 67.5, recommendations: ["Solid performer — bundle with a special for celebrations"] },
  { menu_item_id: "demo-menu-9",  name: "Whiskey Sour",        qty_sold: 94,  revenue: 1222, price_each: 13,  cost_per_serv: 4.3,  profit_per_serv: 8.70,  margin_pct: 66.9, recommendations: ["Close to target margin — watch egg white cost if using"] },
  { menu_item_id: "demo-menu-20", name: "Peach Bellini",       qty_sold: 68,  revenue: 884,  price_each: 13,  cost_per_serv: 4.5,  profit_per_serv: 8.50,  margin_pct: 65.4, recommendations: ["Seasonal — price at $14 to hit 70% target"] },
  { menu_item_id: "demo-menu-10", name: "Cosmopolitan",        qty_sold: 82,  revenue: 1066, price_each: 13,  cost_per_serv: 4.7,  profit_per_serv: 8.30,  margin_pct: 63.8, recommendations: ["Tighten Cointreau spec by 0.25oz — saves $0.20/drink"] },
  { menu_item_id: "demo-menu-18", name: "Draft Lager",         qty_sold: 192, revenue: 1344, price_each: 7,   cost_per_serv: 2.6,  profit_per_serv: 4.40,  margin_pct: 62.9, recommendations: ["Raise price $1 to match IPA — same keg cost"] },
  { menu_item_id: "demo-menu-11", name: "Paloma",              qty_sold: 88,  revenue: 1144, price_each: 13,  cost_per_serv: 4.8,  profit_per_serv: 8.20,  margin_pct: 63.1, recommendations: ["Patrón cost creeping up — consider using Espolòn as well spirit"] },
  { menu_item_id: "demo-menu-1",  name: "House Margarita",     qty_sold: 156, revenue: 1872, price_each: 12,  cost_per_serv: 4.5,  profit_per_serv: 7.50,  margin_pct: 62.5, recommendations: ["Raise price $1 — most Nashville bars charge $13+", "Tighten Patrón spec by 0.25oz"] },
  { menu_item_id: "demo-menu-6",  name: "Negroni",             qty_sold: 82,  revenue: 1148, price_each: 14,  cost_per_serv: 5.6,  profit_per_serv: 8.40,  margin_pct: 60.0, recommendations: ["Review Campari spec", "Consider batching for service speed"] },
  { menu_item_id: "demo-menu-3",  name: "Moscow Mule",         qty_sold: 124, revenue: 1612, price_each: 13,  cost_per_serv: 5.2,  profit_per_serv: 7.80,  margin_pct: 60.0, recommendations: ["Ginger beer cost increased — recalculate spec or raise price $1"] },
  { menu_item_id: "demo-menu-15", name: "House Red Wine",      qty_sold: 96,  revenue: 1056, price_each: 11,  cost_per_serv: 4.4,  profit_per_serv: 6.60,  margin_pct: 60.0, recommendations: ["Raise pour price to $12 to match house white"] },
  { menu_item_id: "demo-menu-16", name: "House White Wine",    qty_sold: 104, revenue: 1144, price_each: 11,  cost_per_serv: 4.4,  profit_per_serv: 6.60,  margin_pct: 60.0, recommendations: ["Raise pour price to $12 — market rate is $12–14 in Nashville"] },
  { menu_item_id: "demo-menu-12", name: "Dark & Stormy",       qty_sold: 92,  revenue: 1104, price_each: 12,  cost_per_serv: 5.0,  profit_per_serv: 7.00,  margin_pct: 58.3, recommendations: ["Ginger beer and rum both up in cost — raise to $13"] },
  { menu_item_id: "demo-menu-8",  name: "Gin & Tonic",         qty_sold: 106, revenue: 1272, price_each: 12,  cost_per_serv: 5.8,  profit_per_serv: 6.20,  margin_pct: 51.7, recommendations: ["Below target — tonic supplier increase not absorbed", "Raise price to $13 or switch to house gin for standard build"] },
];

// ── Ingest runs ───────────────────────────────────────────────────────────────
export const demoIngestRuns = [
  { id: "demo-run-1", location_id: DEMO_LOCATION_ID, location_name: demoLocation.name, source: "csv", status: "completed", started_at: new Date(Date.now() - 2 * dayMs).toISOString(),  finished_at: new Date(Date.now() - 2 * dayMs + 18 * 60000).toISOString(), error_summary: null },
  { id: "demo-run-2", location_id: DEMO_LOCATION_ID, location_name: demoLocation.name, source: "csv", status: "completed", started_at: new Date(Date.now() - 5 * dayMs).toISOString(),  finished_at: new Date(Date.now() - 5 * dayMs + 22 * 60000).toISOString(), error_summary: null },
  { id: "demo-run-3", location_id: DEMO_LOCATION_ID, location_name: demoLocation.name, source: "csv", status: "warning",   started_at: new Date(Date.now() - 9 * dayMs).toISOString(),  finished_at: new Date(Date.now() - 9 * dayMs + 25 * 60000).toISOString(), error_summary: "3 rows skipped (missing SKU)" },
  { id: "demo-run-4", location_id: DEMO_LOCATION_ID, location_name: demoLocation.name, source: "csv", status: "completed", started_at: new Date(Date.now() - 16 * dayMs).toISOString(), finished_at: new Date(Date.now() - 16 * dayMs + 20 * 60000).toISOString(),error_summary: null },
];

export const demoIngestRows = [
  { row_type: "orders",      row_number: 12, row_data: { order_id: "A-1842", closed_at: isoDate(-1), gross: 186.5 } },
  { row_type: "order_items", row_number: 45, row_data: { order_id: "A-1842", item: "House Margarita", qty: 2, gross: 24 } },
  { row_type: "modifiers",   row_number: 88, row_data: { order_id: "A-1842", modifier: "Top Shelf", gross: 4 } },
];

// ── Ask Your Data ─────────────────────────────────────────────────────────────
export const demoAskAnswers: Record<string, string> = {
  default:
    "For Mitchell's Cocktail Bar this week: your biggest unaccounted usage is **Tito's Vodka** ($5.53 lost) and **Patrón Silver** ($5.04 lost) — both trending worse on weekends. Maker's Mark is also down $3.52 with no clear explanation yet. Total unaccounted cost across all items is **$27/week**, which projects to ~$1,400/year. Your top-earner is the Espresso Martini at 78.7% margin, and your weakest is the Gin & Tonic at 51.7%. I'd focus on tightening pour standards on spirits this Friday before service.",
  "what is my biggest cost issue":
    "Your biggest cost issue is **spirits over-pouring**: Tito's (-23.2%), Patrón (-30%), and Maker's Mark (-16.8%) together represent about **$14/week in unaccounted usage**. All three are worse on Friday and Saturday. Enforce jigger use and run a quick pour check before Friday service.",
  "which items should i reorder":
    "Based on your 14-day forecast vs current stock:\n\n• **Tito's Vodka 1.75L** — 118 oz on hand vs 308 oz needed. Order today (3-day lead time).\n• **Patrón Silver 750ml** — 51 oz on hand vs 154 oz needed. Critical — order immediately.\n• **Fresh Lime Juice** — 64 oz on hand vs 224 oz needed. Order this week.\n• **Maker's Mark 750ml** — 38 oz on hand vs 196 oz needed. Order now.\n\nBoth kegs are in good shape. Draft IPA at 50% on-hand, Lager at 37%.",
  "what are my worst performing drinks":
    "By profit margin, your bottom 3 are:\n\n1. **Gin & Tonic** — 51.7% margin. Tonic water cost has gone up but price hasn't changed. Raise to $13 or swap the standard build to house gin.\n2. **Dark & Stormy** — 58.3% margin. Both rum and ginger beer costs are up. Raise to $13.\n3. **House Margarita** — 62.5% margin. You're $1 below the Nashville market average. A $1 raise would generate ~$156/month extra.",
};

// ── AI: Ordering summary ──────────────────────────────────────────────────────
export const demoAiOrderingSummary = {
  summary: "Three draft orders are pending totalling $636. Spirits are the critical reorder — Tito's, Patrón, and Maker's Mark are all on track for stockout before the weekend without approval today.",
  top_actions: [
    { action: "Approve Metro Spirits draft ($636 total)", reason: "Vodka, tequila, and bourbon all projected to run out by Thursday at current pace", urgency: "high" },
    { action: "Approve Nashville Mixers draft ($204 total)", reason: "Lime and ginger beer are below par for weekend demand", urgency: "med" },
  ],
  risk_notes: [
    { risk: "Patrón stockout — Friday high",           impact: "Loss of 15–20 Margarita and Paloma sales (~$195 revenue)" },
    { risk: "Maker's Mark variance + low stock",        impact: "If unaccounted usage continues, you'll need 2x the order quantity" },
    { risk: "Tito's 3-day lead time",                  impact: "Order today to guarantee delivery before Friday night service" },
  ],
  confidence: 0.88,
};

// ── AI: Variance explain ──────────────────────────────────────────────────────
export const demoAiVarianceExplain = {
  findings: [
    {
      item: "Tito's Vodka 1.75L",
      variance_pct: -23.2,
      unaccounted_cost_usd: 5.53,
      z_score: 2.3,
      trend_direction: "worsening",
      hypotheses: [
        "Free-pouring on high-volume Friday/Saturday nights instead of using a jigger",
        "Unrecorded complimentary drinks during happy hour",
        "Measurement rounding during weekly count",
      ],
      recommended_checks: [
        "Compare Friday/Saturday pour velocity vs transaction count — is the ratio off?",
        "Check comp log from last 7 days for unmatched vodka pours",
        "Spot-count Tito's mid-shift this Friday and compare to opening count",
      ],
      severity: "high",
    },
    {
      item: "Patrón Silver 750ml",
      variance_pct: -30.0,
      unaccounted_cost_usd: 5.04,
      z_score: 2.8,
      trend_direction: "worsening",
      hypotheses: [
        "After-hours access to premium well — no matching transaction records",
        "Over-spec on Margarita and Paloma builds during a busy rush",
      ],
      recommended_checks: [
        "Review who has access to the bar area after service — check the last 7 days",
        "Audit Margarita spec compliance — is the team actually measuring 1.5oz or eyeballing?",
      ],
      severity: "high",
    },
    {
      item: "Maker's Mark 750ml",
      variance_pct: -16.8,
      unaccounted_cost_usd: 3.52,
      z_score: 1.9,
      trend_direction: "worsening",
      hypotheses: [
        "Over-pouring on Old Fashioneds and Whiskey Sours during busy service",
        "Upsell requests not always rung through POS (guest asks for 'bourbon upgrade')",
      ],
      recommended_checks: [
        "Check if Maker's Mark upsells are being rung in POS or going unrecorded",
        "Spot-check Old Fashioned builds — confirm 2oz spec is being followed",
      ],
      severity: "med",
    },
    {
      item: "Fresh Lime Juice",
      variance_pct: -19.4,
      unaccounted_cost_usd: 0.67,
      z_score: 1.4,
      trend_direction: "stable",
      hypotheses: ["Batch prep loss during juice extraction", "Waste during peak service rush"],
      recommended_checks: [
        "Weigh limes before and after batch press and log the yield",
        "Brief prep staff on standard 1.5 oz recipe spec",
      ],
      severity: "med",
    },
  ],
  non_accusatory_note:
    "These are possible reasons, not conclusions. Please look into them before making any decisions about your team.",
};

// ── AI: Weekly brief ──────────────────────────────────────────────────────────
export const demoAiWeeklyBrief = {
  week_range: "Last 7 days",
  wins: [
    { title: "Espresso Martini — top earner again",   detail: "78.7% margin, 148 sold — up 16% vs prior week. Your best drink. Make sure every bartender knows this spec." },
    { title: "Draft volume at record high",           detail: "430 pints sold across IPA and Lager — up 11% vs prior week. Keg rotation is working." },
    { title: "Pornstar Martini taking off",           detail: "84 sold this week — a new addition that's already in your top 5 by volume." },
  ],
  watchouts: [
    { title: "Patrón variance is getting worse",      detail: "30% unaccounted this week — highest in 8 weeks. $5 lost per week. Needs investigation before Friday." },
    { title: "Maker's Mark pattern is new",           detail: "16.8% unaccounted — this is only the 2nd week this has appeared. Worth checking now before it becomes a pattern." },
    { title: "Gin & Tonic is still below target",     detail: "51.7% margin — the worst on your menu. Tonic water cost went up and the price hasn't changed." },
  ],
  next_actions: [
    { action: "Check Patrón and Maker's Mark before Friday service", why: "Combined $8.56/week in unaccounted usage. Jigger check + spot-count recommended.", expected_impact: "Reduce unaccounted usage by ~60% if over-pouring is the cause" },
    { action: "Approve Metro Spirits PO today",                      why: "Tito's, Patrón, and Maker's Mark are all on stockout track.", expected_impact: "Prevents up to $390 in lost weekend sales" },
    { action: "Raise Gin & Tonic to $13",                            why: "Tonic cost increase makes $12 unviable. Nashville market average is $13.", expected_impact: "+$106/month at current volume" },
    { action: "Standardize lime batch yield",                        why: "3-week consistent waste pattern costing ~$13/week.",                        expected_impact: "Save ~$50/month in lime waste" },
  ],
  estimated_roi: { time_saved_hours: 5.5, waste_reduced_usd: 620, stockouts_avoided_est: 3 },
};

// ── AI: Menu suggestions ──────────────────────────────────────────────────────
export const demoAiMenuSuggestions = {
  suggestions: [
    { drink: "House Margarita",  current_price: 12, suggested_price: 13, margin_impact_monthly: 312, rationale: "62.5% margin — below your average. Nashville cocktail market benchmark is $13. A $1 increase is overdue and won't affect volume.", risk: "Test on a Thursday first, then roll out" },
    { drink: "Gin & Tonic",      current_price: 12, suggested_price: 13, margin_impact_monthly: 212, rationale: "Tonic water costs went up 12% last month. At $12 you're only making 51.7%. A $1 increase restores margin to a workable 58%.", risk: "Monitor repeat orders for 2 weeks after the change" },
    { drink: "Draft IPA",        current_price: 8,  suggested_price: 9,  margin_impact_monthly: 476, rationale: "Your highest volume drink (238/week). Still below most Nashville craft beer bars at $9. Strong demand elasticity here.", risk: "Watch for a volume dip in the first 2 weeks" },
    { drink: "House Red Wine",   current_price: 11, suggested_price: 12, margin_impact_monthly: 192, rationale: "Nashville wine pours average $12–14. You're $1 below your own house white. Simple alignment increase.", risk: "Minimal — wine guests are least price-sensitive on $1 changes" },
    { drink: "Moscow Mule",      current_price: 13, suggested_price: 14, margin_impact_monthly: 248, rationale: "Ginger beer cost increase has eroded margin to 60%. A $1 increase brings you back in line with the market and restores margin.", risk: "Ginger beer price sensitivity is low — Moscow Mule guests tend to be brand-loyal to the drink" },
  ],
};

// ── AI: Shift push ────────────────────────────────────────────────────────────
export const demoAiShiftPush = {
  push_items: [
    { item: "Espresso Martini",  why: "78.7% margin, consistent demand after 9pm, cold brew fully stocked", script: "Our espresso martini is the move tonight — cold brew, silky finish. Want one to start?", priority: "high" },
    { item: "Pornstar Martini",  why: "72.7% margin and it's the fastest-growing drink on the menu this month", script: "Have you tried our Pornstar Martini yet? It comes with a shot of Prosecco on the side — everyone loves it.", priority: "high" },
    { item: "Old Fashioned",     why: "Maker's Mark overstock — push to move inventory back to par", script: "Our house Old Fashioned is excellent tonight — Maker's Mark build with house bitters. Classic choice.", priority: "med" },
    { item: "Hugo Spritz",       why: "70% margin and St-Germain is well-stocked — seasonal item performing well", script: "If you want something light and floral, our Hugo Spritz is the one right now — elderflower and Prosecco.", priority: "med" },
  ],
};

// ── AI: Count schedule ────────────────────────────────────────────────────────
export const demoAiCountSchedule = {
  cadence: [
    { item: "Tito's Vodka 1.75L",   recommended_frequency: "2x weekly", why: "Consistent unaccounted usage for 8 weeks — needs close monitoring until resolved",     variance_score: 0.88 },
    { item: "Patrón Silver 750ml",  recommended_frequency: "2x weekly", why: "30% unaccounted this week — worst in 8 weeks. Count every Wednesday and Sunday",       variance_score: 0.92 },
    { item: "Maker's Mark 750ml",   recommended_frequency: "2x weekly", why: "New pattern — unaccounted usage appearing for the second consecutive week",             variance_score: 0.74 },
    { item: "Grey Goose 750ml",     recommended_frequency: "weekly",    why: "Premium spirit with moderate unaccounted usage — worth a weekly check",                 variance_score: 0.62 },
    { item: "Fresh Lime Juice",     recommended_frequency: "weekly",    why: "Consistent over-usage for 3 weeks — likely prep waste but needs to be confirmed",       variance_score: 0.64 },
    { item: "Ginger Beer (case)",   recommended_frequency: "weekly",    why: "Higher-than-expected usage — Moscow Mules and Dark & Stormys are both moving fast",     variance_score: 0.48 },
    { item: "Draft IPA Half Keg",   recommended_frequency: "weekly",    why: "High volume — weekly count prevents running out mid-service",                           variance_score: 0.42 },
    { item: "Draft Lager Half Keg", recommended_frequency: "weekly",    why: "High volume and similar pattern to IPA keg",                                            variance_score: 0.40 },
    { item: "Jameson 750ml",        recommended_frequency: "weekly",    why: "Occasional variance flag — worth weekly check",                                         variance_score: 0.38 },
    { item: "Hendrick's Gin 750ml", recommended_frequency: "biweekly",  why: "Stable usage — no flags in 4 weeks",                                                   variance_score: 0.18 },
    { item: "Cointreau 750ml",      recommended_frequency: "biweekly",  why: "Minor unaccounted usage last week — monitor but not urgent",                            variance_score: 0.25 },
    { item: "Aperol 750ml",         recommended_frequency: "biweekly",  why: "Stable — Aperol Spritz is consistent and well-managed",                                 variance_score: 0.14 },
  ],
};

// ── AI: Data gap ──────────────────────────────────────────────────────────────
export const demoAiDataGap = {
  gaps: [
    { gap: "Missing vendor lead times on 8 items",    why_it_matters: "Lead times improve reorder timing accuracy and prevent stockouts",                          expected_improvement: "Reduce stockout risk by ~20%",      how_to_collect: "Add lead_time_days to each vendor item under Ordering → Vendors",               priority: "high" },
    { gap: "Ingredient costs not updated in 30+ days",why_it_matters: "Profit margins are calculated on stale costs — Gin & Tonic may be even worse than 51.7%",  expected_improvement: "Improve margin accuracy by ~8%",    how_to_collect: "Upload latest invoices or update cost_per_oz under Inventory → Ingredients",    priority: "high" },
    { gap: "No drink specs for Dark & Stormy, Paloma",why_it_matters: "Without specs, we can't detect over-pouring or calculate accurate pour cost for 2 items",   expected_improvement: "Enable margin analysis for 2 more items", how_to_collect: "Add spec cards under Profit → New Drink Spec",                               priority: "med"  },
    { gap: "No events calendar entries",              why_it_matters: "Upcoming events (concerts, sports, holidays) affect demand forecasting accuracy",           expected_improvement: "Improve forecast accuracy by ~15%", how_to_collect: "Add local events under Dashboard → Events",                                     priority: "med"  },
  ],
};

// ── AI: Competitive Pricing ───────────────────────────────────────────────────
export const demoAiCompetitivePricing = {
  market_tier: "mid",
  city: "Nashville",
  total_monthly_opportunity: 1284,
  summary: "Mitchell's Cocktail Bar is priced below the Nashville mid-market benchmark on 6 drinks, leaving an estimated $1,284/month on the table. The biggest opportunities are raising the Draft IPA by $1 (highest volume) and bringing cocktails in line with the $13 Nashville standard.",
  suggestions: [
    { drink: "Draft IPA",        current_price: 8,  suggested_price: 9,  market_benchmark: 8,   monthly_revenue_gain: 476, rationale: "Nashville's mid-market benchmark for a pint of craft draft is $8–9. At 238 pints/week, a $1 increase is your single biggest revenue lever.", risk: "Small volume dip expected in first 2 weeks — monitor closely" },
    { drink: "House Margarita",  current_price: 12, suggested_price: 13, market_benchmark: 13,  monthly_revenue_gain: 312, rationale: "The Nashville cocktail benchmark is $13. You're $1 below standard and this is your 3rd-highest volume cocktail.", risk: "Low sensitivity — test on a slow night first" },
    { drink: "Moscow Mule",      current_price: 13, suggested_price: 14, market_benchmark: 13,  monthly_revenue_gain: 248, rationale: "At 60% margin and rising ginger beer costs, raising to $14 is justified and still within Nashville market range.", risk: "Monitor for 2 weeks post-change" },
    { drink: "House Red Wine",   current_price: 11, suggested_price: 12, market_benchmark: 12,  monthly_revenue_gain: 192, rationale: "Nashville wine pours average $12–14. You're at the floor of the market and $1 below your own house white.", risk: "Minimal — wine guests are least price-sensitive on $1 moves" },
    { drink: "Gin & Tonic",      current_price: 12, suggested_price: 13, market_benchmark: 13,  monthly_revenue_gain: 212, rationale: "Tonic costs are up and you're at 51.7% margin. The $13 Nashville benchmark makes a price increase both market-justified and margin-essential.", risk: "Watch repeat orders — G&T guests can be habitual" },
    { drink: "Draft Lager",      current_price: 7,  suggested_price: 8,  market_benchmark: 8,   monthly_revenue_gain: 384, rationale: "At $7 you're a dollar below the market floor for a lager pint. 192 pints/week makes this a significant opportunity.", risk: "Announce alongside the IPA increase — present as a menu refresh" },
  ],
  benchmarks: [
    { category: "cocktail",      low: 11, mid: 13, high: 16 },
    { category: "beer",          low: 6,  mid: 8,  high: 10 },
    { category: "wine",          low: 9,  mid: 12, high: 15 },
    { category: "shot",          low: 7,  mid: 9,  high: 12 },
    { category: "non-alcoholic", low: 3,  mid: 5,  high: 7  },
  ],
  item_signals: [
    { name: "Draft IPA",        category: "beer",     current_price: 8,  benchmark_price: 8,  price_gap_pct: 0,    signal: "at_market",        monthly_opportunity_usd: 0,   qty_sold_30d: 952  },
    { name: "House Margarita",  category: "cocktail", current_price: 12, benchmark_price: 13, price_gap_pct: -7.7, signal: "room_to_increase", monthly_opportunity_usd: 312, qty_sold_30d: 624  },
    { name: "Espresso Martini", category: "cocktail", current_price: 15, benchmark_price: 13, price_gap_pct: 15.4, signal: "premium",          monthly_opportunity_usd: 0,   qty_sold_30d: 592  },
    { name: "Gin & Tonic",      category: "cocktail", current_price: 12, benchmark_price: 13, price_gap_pct: -7.7, signal: "room_to_increase", monthly_opportunity_usd: 212, qty_sold_30d: 424  },
    { name: "Draft Lager",      category: "beer",     current_price: 7,  benchmark_price: 8,  price_gap_pct: -12.5,signal: "underpriced",       monthly_opportunity_usd: 384, qty_sold_30d: 768  },
    { name: "House Red Wine",   category: "wine",     current_price: 11, benchmark_price: 12, price_gap_pct: -8.3, signal: "room_to_increase", monthly_opportunity_usd: 192, qty_sold_30d: 384  },
  ],
};

// ── AI: Seasonal Specials ─────────────────────────────────────────────────────
export const demoAiSeasonalSpecials = {
  season: "spring",
  holiday_window: "none",
  seasonal_context: {
    holiday_label: null,
    occasion_notes: "Spring drinkers want fresh, light, and floral. Spritz-style drinks and garden herb cocktails perform well.",
  },
  specials: [
    {
      name: "Nashville Blossom",
      tagline: "St-Germain, Prosecco & fresh lemon",
      ingredients: [{ ingredient: "St-Germain Elderflower", amount: "1 oz" }, { ingredient: "Prosecco", amount: "3 oz" }, { ingredient: "Fresh Lemon Juice", amount: "0.5 oz" }, { ingredient: "Cucumber slice", amount: "garnish" }],
      suggested_price: 14,
      estimated_cost: 3.8,
      estimated_margin_pct: 72.9,
      uses_overstock: true,
      bartender_pitch: "Our Nashville Blossom is the spring drink right now — elderflower, Prosecco, fresh lemon. Light and gorgeous.",
      seasonal_reason: "Uses your St-Germain which is well-stocked, and hits the floral spring profile perfectly.",
    },
    {
      name: "Garden Mule",
      tagline: "Hendrick's, cucumber, ginger beer & mint",
      ingredients: [{ ingredient: "Hendrick's Gin", amount: "1.5 oz" }, { ingredient: "Ginger Beer", amount: "4 oz" }, { ingredient: "Fresh Lime Juice", amount: "0.5 oz" }, { ingredient: "Cucumber slices", amount: "3 slices" }, { ingredient: "Fresh Mint", amount: "sprig garnish" }],
      suggested_price: 14,
      estimated_cost: 3.6,
      estimated_margin_pct: 74.3,
      uses_overstock: true,
      bartender_pitch: "The Garden Mule is our spring twist on a Moscow Mule — Hendrick's gin with cucumber and ginger beer. Really refreshing.",
      seasonal_reason: "Ginger beer overstock + Hendrick's well-stocked. Cucumber profile is a spring staple.",
    },
    {
      name: "Aperol Sunrise",
      tagline: "Aperol, fresh OJ, Prosecco & grenadine",
      ingredients: [{ ingredient: "Aperol", amount: "1.5 oz" }, { ingredient: "Fresh Orange Juice", amount: "2 oz" }, { ingredient: "Prosecco", amount: "2 oz" }, { ingredient: "Grenadine", amount: "0.25 oz" }],
      suggested_price: 14,
      estimated_cost: 3.9,
      estimated_margin_pct: 72.1,
      uses_overstock: false,
      bartender_pitch: "Our Aperol Sunrise is the brunch-to-bar drink this spring — citrusy, bubbly, and beautiful in the glass.",
      seasonal_reason: "Aperol Spritz is already a strong seller — this variation capitalises on the same demand.",
    },
    {
      name: "Spiced Paloma Smash",
      tagline: "Patrón, grapefruit, jalapeño & lime",
      ingredients: [{ ingredient: "Patrón Silver", amount: "1.5 oz" }, { ingredient: "Fresh Grapefruit Juice", amount: "1.5 oz" }, { ingredient: "Fresh Lime Juice", amount: "0.5 oz" }, { ingredient: "Simple Syrup", amount: "0.5 oz" }, { ingredient: "Jalapeño slice", amount: "muddled" }],
      suggested_price: 15,
      estimated_cost: 4.1,
      estimated_margin_pct: 72.7,
      uses_overstock: false,
      bartender_pitch: "The Spiced Paloma is our elevated tequila special this month — fresh grapefruit with a kick of jalapeño. A real Nashville crowd-pleaser.",
      seasonal_reason: "Tequila and citrus are at peak demand in spring. Spicy-citrus profile is trending nationally.",
    },
    {
      name: "Strawberry Basil Fizz",
      tagline: "Tito's, fresh strawberry, basil & soda",
      ingredients: [{ ingredient: "Tito's Vodka", amount: "1.5 oz" }, { ingredient: "Fresh Strawberry", amount: "3 muddled" }, { ingredient: "Fresh Basil", amount: "4 leaves muddled" }, { ingredient: "Simple Syrup", amount: "0.5 oz" }, { ingredient: "Soda Water", amount: "2 oz" }, { ingredient: "Fresh Lime Juice", amount: "0.25 oz" }],
      suggested_price: 14,
      estimated_cost: 3.2,
      estimated_margin_pct: 77.1,
      uses_overstock: true,
      bartender_pitch: "Fresh strawberry and basil muddled with Tito's — our Strawberry Basil Fizz is the most Instagrammed drink we've put out this spring.",
      seasonal_reason: "Uses Tito's (your highest-volume spirit), adds a seasonal fresh ingredient at low cost, high visual appeal.",
    },
  ],
};

// ── AI: Vendor benchmarks ─────────────────────────────────────────────────────
export const demoAiVendorBenchmarks = {
  city: "Nashville",
  market_tier: "mid",
  total_annual_savings: 2184,
  summary: "Metro Spirits Supply is charging above market on 3 premium spirits. Switching or negotiating on Patrón, Grey Goose, and Hendrick's alone could save $2,184/year. Music City Beer Distributors' IPA keg pricing is competitive — no action needed there.",
  recommendations: [
    { item: "Patrón Silver 750ml",   your_price: 38,  market_price: 28, action: "You're paying $10 over market. Get a quote from Southern Wine & Spirits or Republic National. At 4 bottles/week, this saves $2,080/year.", annual_savings: 2080, urgency: "high" as const },
    { item: "Grey Goose 750ml",      your_price: 42,  market_price: 33, action: "Grey Goose market rate is $33–36 at distributor level. Ask Metro for a volume discount or benchmark against a secondary supplier.", annual_savings: 562,  urgency: "med" as const  },
    { item: "Hendrick's Gin 750ml",  your_price: 38,  market_price: 28, action: "Hendrick's distributor wholesale is typically $26–30. You're paying $8–10 over. This is worth a single call to your rep.", annual_savings: 416,  urgency: "med" as const  },
    { item: "Tonic Water (case/24)", your_price: 24,  market_price: 20, action: "Club soda and tonic are commodities. Switch to a restaurant supply distributor — saves ~$4/case.", annual_savings: 208,  urgency: "low" as const  },
  ],
  vendor_signals: [
    { item_name: "Tito's Vodka 1.75L",  your_cost_per_unit: 28,  benchmark_mid: 28,  overpaying_by_usd: 0,  signal: "at_market",     action: "Competitive pricing. No action needed." },
    { item_name: "Patrón Silver 750ml", your_cost_per_unit: 38,  benchmark_mid: 28,  overpaying_by_usd: 10, signal: "overpaying",    action: "You're paying $10 above market. Get competing quotes." },
    { item_name: "Grey Goose 750ml",    your_cost_per_unit: 42,  benchmark_mid: 33,  overpaying_by_usd: 9,  signal: "overpaying",    action: "Ask for a volume discount or compare suppliers." },
    { item_name: "Hendrick's Gin 750ml",your_cost_per_unit: 38,  benchmark_mid: 28,  overpaying_by_usd: 10, signal: "overpaying",    action: "Worth a call to your rep — $10 over market." },
    { item_name: "Jameson 750ml",       your_cost_per_unit: 26,  benchmark_mid: 24,  overpaying_by_usd: 2,  signal: "slightly_high", action: "Slightly above market — ask for pricing review at next order." },
    { item_name: "Draft IPA Half Keg",  your_cost_per_unit: 148, benchmark_mid: 160, overpaying_by_usd: 0,  signal: "great_price",   action: "Below market floor — excellent pricing. Lock this vendor in." },
    { item_name: "Draft Lager Half Keg",your_cost_per_unit: 98,  benchmark_mid: 105, overpaying_by_usd: 0,  signal: "great_price",   action: "Below market rate. Keep this vendor for both kegs." },
    { item_name: "Tonic Water (case)",  your_cost_per_unit: 24,  benchmark_mid: 20,  overpaying_by_usd: 4,  signal: "slightly_high", action: "Consider switching to a restaurant supply distributor." },
  ],
};

// ── AI: Dead SKU detector ─────────────────────────────────────────────────────
export const demoAiDeadSku = {
  total_carrying_cost_usd: 28.40,
  total_monthly_savings: 34,
  summary: "Two menu items haven't been ordered in 60+ days and a third is a seasonal item still on the menu out of season. Cutting these cleans up the menu and frees up ~$28 in dead stock.",
  recommendations: [
    { item: "Pumpkin Spice Mule",  signal: "seasonal_mismatch", action: "cut",            reason: "0 orders in 90 days — this was a fall seasonal that's still on the menu in April. Guests aren't ordering it and it's cluttering your cocktail list.", suggested_replacement: "Garden Mule (spring seasonal special)",               monthly_savings: 12 },
    { item: "Lavender Collins",    signal: "dead",              action: "cut",            reason: "1 order in 90 days. The lavender syrup is sitting unused — it expires before you'll use it naturally. Cut it and use the St-Germain instead.", suggested_replacement: "Nashville Blossom (uses your St-Germain overstock)", monthly_savings: 18 },
    { item: "Peach Bellini",       signal: "dying",             action: "run_as_special", reason: "Only 6 orders in the last 30 days vs 22 in the prior 30. It's fading fast. Run it as a happy hour special to clear stock before removing it.", suggested_replacement: null,                                                   monthly_savings: 4  },
  ],
  dead_skus: [
    { menu_item_id: "demo-menu-21", name: "Pumpkin Spice Mule", category: "cocktail", qty_sold_30d: 0,  qty_sold_60d: 0,  qty_sold_90d: 0,  current_price: 13, cost_per_serving: 4.2, estimated_inventory_on_hand_usd: 14.70, signal: "seasonal_mismatch", signal_label: "Out of season", recommendation: "Remove and replace with a spring special.", monthly_carrying_cost_usd: 0.29 },
    { menu_item_id: "demo-menu-22", name: "Lavender Collins",   category: "cocktail", qty_sold_30d: 1,  qty_sold_60d: 1,  qty_sold_90d: 1,  current_price: 13, cost_per_serving: 4.8, estimated_inventory_on_hand_usd: 19.20, signal: "dead",              signal_label: "Not ordered in 90 days", recommendation: "Cut it and use the St-Germain overstock in the Nashville Blossom instead.", monthly_carrying_cost_usd: 0.38 },
    { menu_item_id: "demo-menu-20", name: "Peach Bellini",      category: "cocktail", qty_sold_30d: 6,  qty_sold_60d: 28, qty_sold_90d: 68, current_price: 13, cost_per_serving: 4.5, estimated_inventory_on_hand_usd: 54.00, signal: "dying",             signal_label: "Almost never ordered", recommendation: "Run as a happy hour special to move inventory before removing.", monthly_carrying_cost_usd: 1.08 },
  ],
};

// ── AI: Margin engineering ────────────────────────────────────────────────────
export const demoAiMarginEngineering = {
  total_monthly_impact: 892,
  summary: "Six drinks are below the 70% margin target, with three showing clear recipe or pour-size fixes. The biggest single opportunity is enforcing jigger use on Tito's — it's your most over-poured spirit at an estimated $218/month in waste.",
  recommendations: [
    { drink: "Tito's Vodka (well pours)", problem: "Tito's is your most over-poured spirit — 23% unaccounted usage over 8 weeks, costing $218/month. The spec says 1.5oz but bartenders are consistently pouring 1.7–1.8oz.",       fix: "Enforce jigger use on all Tito's pours. Do a 5-minute pour demo before Friday service. Track whether unaccounted usage drops next week.", fix_type: "enforce_jigger",  monthly_impact_usd: 218, current_margin_pct: 62.5, target_margin_pct: 70, priority: "high" as const },
    { drink: "Gin & Tonic",              problem: "At $12 and $5.80 cost, you're only making 51.7% margin — the worst on your menu. Tonic water went up 12% last month and the price hasn't moved.",                             fix: "Raise price to $13. This gets you to 55.4% margin — still not ideal but manageable. Also consider swapping to a house gin (Bombay Sapphire) for standard builds to reduce cost by $0.90/drink.", fix_type: "raise_price",    monthly_impact_usd: 212, current_margin_pct: 51.7, target_margin_pct: 70, priority: "high" as const },
    { drink: "House Margarita",          problem: "62.5% margin on your 3rd-highest volume cocktail. Patrón is the highest-cost ingredient at 58% of the drink's total cost. Small spec reduction has significant impact.",          fix: "Reduce Patrón pour from 1.5oz to 1.25oz in the standard build. Saves $0.35/drink. At 624 sells/month = $218 savings. Use Espolòn as the well tequila if guests don't specify Patrón.", fix_type: "reduce_spec",    monthly_impact_usd: 218, current_margin_pct: 62.5, target_margin_pct: 70, priority: "high" as const },
    { drink: "Moscow Mule",              problem: "60% margin and ginger beer costs increased 18% since the spec was written. The build uses 4oz of ginger beer — that's the single driver of margin erosion.",                     fix: "Raise price from $13 to $14 (market benchmark). Alternatively, reduce ginger beer to 3.5oz and add a lime wheel garnish — nearly imperceptible to guests, saves $0.18/drink.", fix_type: "raise_price",    monthly_impact_usd: 248, current_margin_pct: 60.0, target_margin_pct: 70, priority: "med" as const  },
    { drink: "Negroni",                  problem: "60% margin with Campari, Maker's Mark, and Cointreau all in the build. Three premium ingredients with no spec efficiency gains in the current recipe.",                           fix: "Consider a Negroni batch program — batch 10 servings at a time, pre-diluted. Reduces waste and service time. Also allows tighter portion control on all 3 spirits.", fix_type: "adjust_spec",    monthly_impact_usd: 98,  current_margin_pct: 60.0, target_margin_pct: 70, priority: "med" as const  },
    { drink: "Dark & Stormy",            problem: "58.3% margin. Both Bacardi and ginger beer have increased in cost since this drink was priced.",                                                                                  fix: "Raise price from $12 to $13. Still within Nashville market range and aligns with the Moscow Mule change — present as a coordinated menu refresh.", fix_type: "raise_price",    monthly_impact_usd: 184, current_margin_pct: 58.3, target_margin_pct: 70, priority: "med" as const  },
  ],
  opportunities: [
    { drink_name: "Tito's over-pour",  current_margin_pct: 62.5, target_margin_pct: 70, current_cost_usd: 4.5,  opportunity_type: "reduce_pour",  opportunity_label: "Bartenders may be over-pouring", highest_cost_ingredient: "Tito's Vodka",      highest_cost_ingredient_pct: 72, monthly_impact_usd: 218, qty_sold_30d: 624, suggested_tweak: "Enforce jigger use — 23% consistent unaccounted usage. Save $218/month." },
    { drink_name: "Gin & Tonic",       current_margin_pct: 51.7, target_margin_pct: 70, current_cost_usd: 5.8,  opportunity_type: "price_increase",opportunity_label: "Price is too low for cost",    highest_cost_ingredient: "Hendrick's Gin",    highest_cost_ingredient_pct: 58, monthly_impact_usd: 212, qty_sold_30d: 424, suggested_tweak: "Raise to $13 and consider house gin for standard build." },
    { drink_name: "House Margarita",   current_margin_pct: 62.5, target_margin_pct: 70, current_cost_usd: 4.5,  opportunity_type: "reduce_spec",   opportunity_label: "Reduce spirit quantity slightly", highest_cost_ingredient: "Patrón Silver",      highest_cost_ingredient_pct: 58, monthly_impact_usd: 218, qty_sold_30d: 624, suggested_tweak: "Reduce Patrón from 1.5oz to 1.25oz. Saves $0.35/drink." },
  ],
};
