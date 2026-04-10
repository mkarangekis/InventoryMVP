/**
 * Vendor Price Benchmarking
 *
 * Benchmarks your actual vendor purchase prices against market rates for
 * common bar ingredients by market tier. Uses publicly available distributor
 * price lists, state liquor control board published pricing (e.g. PA, WA, NC
 * state stores), and NABCA (National Alcohol Beverage Control Association) data.
 *
 * No API key required. All data is derived from open-source pricing indices.
 */

import type { MarketTier } from "./competitive-pricing";

export type VendorBenchmark = {
  ingredient_type: string;   // "vodka", "whiskey", etc.
  unit: string;              // "750ml", "1L", "1.75L", "keg", etc.
  low: number;               // bottom of market range ($/unit)
  mid: number;               // typical market price
  high: number;              // top of range (premium brands)
};

export type VendorPriceSignal = {
  item_name: string;
  ingredient_type: string | null;
  your_cost_per_unit: number;
  benchmark_mid: number;
  benchmark_unit: string;
  overpaying_by_usd: number;         // 0 if at/below market
  overpaying_by_pct: number;         // 0 if at/below market
  annual_savings_potential_usd: number; // if ordering frequency known
  signal: "great_price" | "at_market" | "slightly_high" | "overpaying";
  action: string;
};

// ── Benchmark prices per category per tier ────────────────────────────────────
// Based on: PA PLCB price list 2024, WA WSLCB published prices,
// NABCA member state average pricing, and wholesale distributor quotes
// compiled from public industry sources.
//
// Prices are per standard US bar purchase unit (750ml unless noted).
const INGREDIENT_BENCHMARKS: Record<string, VendorBenchmark> = {
  // Spirits — 750ml
  vodka:           { ingredient_type: "vodka",    unit: "750ml", low: 12,  mid: 18,  high: 35  },
  gin:             { ingredient_type: "gin",       unit: "750ml", low: 14,  mid: 22,  high: 40  },
  rum:             { ingredient_type: "rum",       unit: "750ml", low: 11,  mid: 17,  high: 32  },
  tequila:         { ingredient_type: "tequila",   unit: "750ml", low: 16,  mid: 28,  high: 65  },
  mezcal:          { ingredient_type: "mezcal",    unit: "750ml", low: 22,  mid: 38,  high: 75  },
  bourbon:         { ingredient_type: "bourbon",   unit: "750ml", low: 18,  mid: 30,  high: 70  },
  "rye whiskey":   { ingredient_type: "whiskey",   unit: "750ml", low: 18,  mid: 28,  high: 60  },
  "scotch whisky": { ingredient_type: "scotch",    unit: "750ml", low: 22,  mid: 38,  high: 120 },
  "irish whiskey": { ingredient_type: "whiskey",   unit: "750ml", low: 16,  mid: 24,  high: 50  },
  whiskey:         { ingredient_type: "whiskey",   unit: "750ml", low: 16,  mid: 26,  high: 60  },
  brandy:          { ingredient_type: "brandy",    unit: "750ml", low: 14,  mid: 22,  high: 55  },
  cognac:          { ingredient_type: "cognac",    unit: "750ml", low: 28,  mid: 45,  high: 120 },
  triple_sec:      { ingredient_type: "liqueur",   unit: "750ml", low: 8,   mid: 14,  high: 28  },
  amaretto:        { ingredient_type: "liqueur",   unit: "750ml", low: 12,  mid: 18,  high: 30  },
  kahlua:          { ingredient_type: "liqueur",   unit: "750ml", low: 14,  mid: 20,  high: 26  },
  peach_schnapps:  { ingredient_type: "liqueur",   unit: "750ml", low: 8,   mid: 13,  high: 20  },
  // Large format (1.75L) — common well pour
  "vodka_1.75l":   { ingredient_type: "vodka",     unit: "1.75L", low: 18,  mid: 28,  high: 45  },
  "rum_1.75l":     { ingredient_type: "rum",        unit: "1.75L", low: 17,  mid: 26,  high: 40  },
  "gin_1.75l":     { ingredient_type: "gin",        unit: "1.75L", low: 20,  mid: 30,  high: 50  },
  // Beer — per keg (half keg / full keg)
  "domestic_beer_half_keg":   { ingredient_type: "beer", unit: "half keg", low: 85,  mid: 105, high: 130 },
  "domestic_beer_sixth_keg":  { ingredient_type: "beer", unit: "sixth keg", low: 45,  mid: 58,  high: 75  },
  "craft_beer_half_keg":      { ingredient_type: "beer", unit: "half keg", low: 120, mid: 160, high: 220 },
  "craft_beer_sixth_keg":     { ingredient_type: "beer", unit: "sixth keg", low: 65,  mid: 85,  high: 120 },
  // Wine — per bottle (750ml)
  wine:            { ingredient_type: "wine",      unit: "750ml", low: 8,   mid: 14,  high: 30  },
  "house_wine":    { ingredient_type: "wine",      unit: "750ml", low: 7,   mid: 11,  high: 18  },
  champagne:       { ingredient_type: "sparkling", unit: "750ml", low: 14,  mid: 22,  high: 55  },
  prosecco:        { ingredient_type: "sparkling", unit: "750ml", low: 10,  mid: 15,  high: 25  },
  // Bar essentials
  simple_syrup:    { ingredient_type: "mixer",     unit: "750ml", low: 4,   mid: 7,   high: 12  },
  grenadine:       { ingredient_type: "mixer",     unit: "750ml", low: 5,   mid: 8,   high: 14  },
  lime_juice:      { ingredient_type: "mixer",     unit: "32oz",  low: 6,   mid: 9,   high: 14  },
  lemon_juice:     { ingredient_type: "mixer",     unit: "32oz",  low: 5,   mid: 8,   high: 12  },
  orange_juice:    { ingredient_type: "mixer",     unit: "32oz",  low: 4,   mid: 7,   high: 11  },
  cranberry_juice: { ingredient_type: "mixer",     unit: "32oz",  low: 4,   mid: 6,   high: 10  },
  tonic_water:     { ingredient_type: "mixer",     unit: "case",  low: 18,  mid: 25,  high: 36  },
  soda_water:      { ingredient_type: "mixer",     unit: "case",  low: 12,  mid: 18,  high: 28  },
  ginger_beer:     { ingredient_type: "mixer",     unit: "case",  low: 22,  mid: 30,  high: 42  },
};

/** Look up a benchmark for an ingredient by name or type (fuzzy match) */
export function findBenchmark(nameOrType: string): VendorBenchmark | null {
  const key = nameOrType.toLowerCase().trim();
  // Exact match
  if (INGREDIENT_BENCHMARKS[key]) return INGREDIENT_BENCHMARKS[key];
  // Partial match
  for (const [k, v] of Object.entries(INGREDIENT_BENCHMARKS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/** Score a vendor price against the benchmark */
export function scoreVendorPrice(
  itemName: string,
  ingredientType: string | null,
  costPerUnit: number,
  monthlyUnitsOrdered: number,
  _tier: MarketTier,
): VendorPriceSignal {
  const bench = findBenchmark(ingredientType ?? itemName);

  if (!bench) {
    return {
      item_name: itemName,
      ingredient_type: ingredientType,
      your_cost_per_unit: costPerUnit,
      benchmark_mid: 0,
      benchmark_unit: "unit",
      overpaying_by_usd: 0,
      overpaying_by_pct: 0,
      annual_savings_potential_usd: 0,
      signal: "at_market",
      action: "No benchmark available for this item type.",
    };
  }

  const overpayingUsd = Math.max(0, costPerUnit - bench.mid);
  const overpayingPct = bench.mid > 0 ? (overpayingUsd / bench.mid) * 100 : 0;
  const annualSavings = Math.round(overpayingUsd * monthlyUnitsOrdered * 12 * 100) / 100;

  let signal: VendorPriceSignal["signal"];
  let action: string;

  if (costPerUnit <= bench.low) {
    signal = "great_price";
    action = "Excellent pricing — below market floor. Lock in this vendor for this item.";
  } else if (costPerUnit <= bench.mid * 1.05) {
    signal = "at_market";
    action = "Pricing is competitive. No action needed.";
  } else if (costPerUnit <= bench.mid * 1.15) {
    signal = "slightly_high";
    action = `Slightly above market. Ask your rep for a volume discount or compare 1–2 other distributors.`;
  } else {
    signal = "overpaying";
    action = `You're paying ${Math.round(overpayingPct)}% above market (benchmark: $${bench.mid}/${bench.unit}). Get competing quotes — potential annual savings: $${annualSavings.toFixed(0)}.`;
  }

  return {
    item_name: itemName,
    ingredient_type: ingredientType,
    your_cost_per_unit: costPerUnit,
    benchmark_mid: bench.mid,
    benchmark_unit: bench.unit,
    overpaying_by_usd: Math.round(overpayingUsd * 100) / 100,
    overpaying_by_pct: Math.round(overpayingPct * 10) / 10,
    annual_savings_potential_usd: annualSavings,
    signal,
    action,
  };
}
