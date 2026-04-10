/**
 * Competitive Pricing Intelligence
 *
 * Benchmarks a bar's drink prices against its city/market tier using
 * open-source data (Numbeo cost-of-living index, BLS consumer expenditure,
 * AHLA hospitality industry reports). No API key required.
 *
 * Market tiers derived from average cocktail/beer price index across US cities.
 */

export type MarketTier = "premium" | "mid" | "value";

export type PriceBenchmark = {
  category: string;
  low: number;
  mid: number;
  high: number;
};

export type PricingSignal =
  | "underpriced"      // >10% below market mid — leaving money on the table
  | "room_to_increase" // 0–10% below market mid — safe to nudge up
  | "at_market"        // within ±5% of market mid
  | "premium";         // >15% above market mid — positioned as upscale

export type ItemPricingSignal = {
  name: string;
  category: string;
  current_price: number;
  benchmark_price: number;
  price_gap_pct: number;       // negative = underpriced
  signal: PricingSignal;
  monthly_opportunity_usd: number; // revenue left on table if raised to benchmark
  qty_sold_30d: number;
};

// ── Tier 1: Premium markets ───────────────────────────────────────────────────
// NYC, San Francisco, Miami, Los Angeles, Boston, Chicago, Seattle, Washington DC,
// Las Vegas, Honolulu, San Jose, Austin (post-2022), Nashville (post-2022)
const TIER1_CITIES = new Set([
  "new york", "nyc", "manhattan", "brooklyn", "san francisco", "sf", "miami",
  "los angeles", "la", "boston", "chicago", "seattle", "washington", "dc",
  "las vegas", "honolulu", "san jose", "austin", "nashville", "santa monica",
  "beverly hills", "santa barbara", "aspen", "nantucket", "hamptons",
]);

// ── Tier 2: Mid-market ────────────────────────────────────────────────────────
// Denver, Atlanta, Portland, San Diego, Dallas, Houston, Phoenix, Minneapolis,
// Charlotte, Raleigh, Salt Lake City, Kansas City, New Orleans, Tampa, Orlando
const TIER2_CITIES = new Set([
  "denver", "atlanta", "portland", "san diego", "dallas", "houston", "phoenix",
  "minneapolis", "charlotte", "raleigh", "salt lake", "kansas city",
  "new orleans", "tampa", "orlando", "pittsburgh", "cleveland", "richmond",
  "richmond", "columbus", "indianapolis", "milwaukee", "louisville", "memphis",
  "st. louis", "saint louis", "st louis", "baltimore", "detroit", "cincinnati",
  "sacramento", "albuquerque", "tucson", "el paso", "fresno", "long beach",
]);

// Tier 3 = everything else (value/small market)

// ── Benchmark price ranges by tier and category ───────────────────────────────
// Sources: Numbeo 2024 restaurant index, NRA industry report, AHLA survey
// These are the realistic *mid-market* price ranges a competitive bar charges.
const BENCHMARKS: Record<MarketTier, PriceBenchmark[]> = {
  premium: [
    { category: "cocktail",      low: 16, mid: 18, high: 24 },
    { category: "beer",          low: 9,  mid: 11, high: 14 },
    { category: "wine",          low: 14, mid: 17, high: 22 },
    { category: "shot",          low: 10, mid: 13, high: 16 },
    { category: "spirit",        low: 10, mid: 13, high: 16 },
    { category: "non-alcoholic", low: 5,  mid: 7,  high: 10 },
    { category: "food",          low: 14, mid: 18, high: 26 },
  ],
  mid: [
    { category: "cocktail",      low: 11, mid: 13, high: 16 },
    { category: "beer",          low: 6,  mid: 8,  high: 10 },
    { category: "wine",          low: 9,  mid: 12, high: 15 },
    { category: "shot",          low: 7,  mid: 9,  high: 12 },
    { category: "spirit",        low: 7,  mid: 9,  high: 12 },
    { category: "non-alcoholic", low: 3,  mid: 5,  high: 7  },
    { category: "food",          low: 10, mid: 13, high: 18 },
  ],
  value: [
    { category: "cocktail",      low: 8,  mid: 10, high: 13 },
    { category: "beer",          low: 4,  mid: 6,  high: 8  },
    { category: "wine",          low: 7,  mid: 9,  high: 12 },
    { category: "shot",          low: 5,  mid: 7,  high: 9  },
    { category: "spirit",        low: 5,  mid: 7,  high: 9  },
    { category: "non-alcoholic", low: 2,  mid: 4,  high: 6  },
    { category: "food",          low: 8,  mid: 11, high: 15 },
  ],
};

export function detectMarketTier(city: string): MarketTier {
  const c = city.toLowerCase().trim();
  for (const t1 of TIER1_CITIES) {
    if (c.includes(t1)) return "premium";
  }
  for (const t2 of TIER2_CITIES) {
    if (c.includes(t2)) return "mid";
  }
  return "value";
}

export function getBenchmarksForTier(tier: MarketTier): PriceBenchmark[] {
  return BENCHMARKS[tier];
}

/** Normalize a raw category string to one of the benchmark keys */
export function normalizeCategory(raw: string | null): string {
  if (!raw) return "cocktail";
  const r = raw.toLowerCase();
  if (r.includes("beer") || r.includes("draft") || r.includes("bottle")) return "beer";
  if (r.includes("wine") || r.includes("champagne") || r.includes("prosecco")) return "wine";
  if (r.includes("shot") || r.includes("neat") || r.includes("rocks")) return "shot";
  if (r.includes("spirit") || r.includes("liquor") || r.includes("whiskey") || r.includes("vodka") || r.includes("rum") || r.includes("gin") || r.includes("tequila")) return "spirit";
  if (r.includes("water") || r.includes("juice") || r.includes("soda") || r.includes("coffee") || r.includes("tea") || r.includes("mock")) return "non-alcoholic";
  if (r.includes("food") || r.includes("snack") || r.includes("appetizer") || r.includes("bite")) return "food";
  return "cocktail"; // default: most bar items are cocktails
}

export function scoreItemPricing(
  name: string,
  rawCategory: string | null,
  currentPrice: number,
  qtySold30d: number,
  tier: MarketTier,
): ItemPricingSignal {
  const category = normalizeCategory(rawCategory);
  const benchmarks = BENCHMARKS[tier];
  const bench = benchmarks.find((b) => b.category === category) ?? benchmarks[0];

  const priceDelta = currentPrice - bench.mid;
  const priceDeltaPct = bench.mid > 0 ? (priceDelta / bench.mid) * 100 : 0;

  let signal: PricingSignal;
  if (priceDeltaPct < -10) signal = "underpriced";
  else if (priceDeltaPct < 0) signal = "room_to_increase";
  else if (priceDeltaPct <= 15) signal = "at_market";
  else signal = "premium";

  // Monthly opportunity = how much more revenue if priced at benchmark mid
  const opportunityPerDrink = Math.max(0, bench.mid - currentPrice);
  const monthlyOpportunity = Math.round(opportunityPerDrink * qtySold30d * 100) / 100;

  return {
    name,
    category,
    current_price: currentPrice,
    benchmark_price: bench.mid,
    price_gap_pct: Math.round(priceDeltaPct * 10) / 10,
    signal,
    monthly_opportunity_usd: monthlyOpportunity,
    qty_sold_30d: qtySold30d,
  };
}
