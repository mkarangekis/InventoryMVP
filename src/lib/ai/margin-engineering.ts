/**
 * Margin Engineering / Recipe Optimization
 *
 * Analyzes each drink's recipe spec to find the single highest-cost ingredient,
 * identifies pour size opportunities, and cross-references variance data to
 * detect over-pouring patterns. Quantifies the margin impact of each tweak.
 */

export type MarginOpportunityType =
  | "reduce_pour"        // spec calls for X oz but variance suggests over-pouring
  | "substitute_spirit"  // swap well for call or call for well based on margin vs perception
  | "reduce_spec"        // reduce ingredient quantity slightly (e.g. 1.5oz → 1.25oz)
  | "high_cost_garnish"  // expensive garnish hurting margin
  | "price_increase"     // simplest fix: just charge more
  | "at_target";         // already engineered well

export type MarginOpportunity = {
  drink_name: string;
  current_margin_pct: number;
  target_margin_pct: number;
  current_cost_usd: number;
  opportunity_type: MarginOpportunityType;
  opportunity_label: string;           // plain English
  highest_cost_ingredient: string;
  highest_cost_ingredient_pct: number; // % of total drink cost this ingredient represents
  monthly_impact_usd: number;          // if fix is applied, monthly margin gain
  qty_sold_30d: number;
  suggested_tweak: string;             // specific, actionable recommendation
};

const TARGET_MARGIN_PCT = 70; // industry standard: 70%+ margin on cocktails
const MIN_ACCEPTABLE_MARGIN_PCT = 60;

export function scoreMarginEngineering(
  drinkName: string,
  currentPrice: number,
  ingredientLines: { ingredient_name: string; ounces: number; cost_per_oz: number }[],
  qtySold30d: number,
  variancePct: number | null, // from variance_flags for the primary spirit
): MarginOpportunity {
  const totalCost = ingredientLines.reduce((s, l) => s + l.ounces * l.cost_per_oz, 0);
  const currentMarginPct = currentPrice > 0 ? ((currentPrice - totalCost) / currentPrice) * 100 : 0;

  // Find the highest cost ingredient
  const sorted = [...ingredientLines].sort((a, b) => (b.ounces * b.cost_per_oz) - (a.ounces * a.cost_per_oz));
  const topIngredient = sorted[0];
  const topIngredientCost = topIngredient ? topIngredient.ounces * topIngredient.cost_per_oz : 0;
  const topIngredientPct = totalCost > 0 ? (topIngredientCost / totalCost) * 100 : 0;

  // Target: what cost gets us to TARGET_MARGIN_PCT at current price?
  const targetCost = currentPrice * (1 - TARGET_MARGIN_PCT / 100);
  const costGap = totalCost - targetCost; // how much we need to reduce cost by

  let opportunity_type: MarginOpportunityType;
  let opportunity_label: string;
  let suggested_tweak: string;
  let monthlySavingsPerDrink = 0;

  if (currentMarginPct >= TARGET_MARGIN_PCT) {
    opportunity_type = "at_target";
    opportunity_label = "Margin is healthy";
    suggested_tweak = `${drinkName} is already at ${currentMarginPct.toFixed(1)}% margin — no changes needed.`;
  } else if (variancePct !== null && variancePct > 0.15 && topIngredient) {
    // High variance on primary spirit = over-pouring
    opportunity_type = "reduce_pour";
    const wasteCostPerDrink = topIngredient.ounces * variancePct * topIngredient.cost_per_oz;
    monthlySavingsPerDrink = wasteCostPerDrink;
    opportunity_label = "Bartenders may be over-pouring";
    suggested_tweak = `${drinkName} shows ${(variancePct * 100).toFixed(0)}% variance on ${topIngredient.ingredient_name}. Enforce the spec: use a jigger and train to the exact ${topIngredient.ounces}oz pour. Estimated savings: $${(wasteCostPerDrink * qtySold30d).toFixed(0)}/month.`;
  } else if (topIngredientPct > 70 && topIngredient && topIngredient.ounces > 1.25) {
    // One expensive ingredient dominates — spec reduction opportunity
    opportunity_type = "reduce_spec";
    const reducedOz = Math.max(1.0, topIngredient.ounces - 0.25);
    const savedCostPerDrink = (topIngredient.ounces - reducedOz) * topIngredient.cost_per_oz;
    monthlySavingsPerDrink = savedCostPerDrink;
    opportunity_label = "Reduce spirit quantity slightly";
    suggested_tweak = `${topIngredient.ingredient_name} is ${topIngredientPct.toFixed(0)}% of ${drinkName}'s cost. Reducing from ${topIngredient.ounces}oz to ${reducedOz}oz saves $${savedCostPerDrink.toFixed(2)}/drink with minimal guest-perceived difference. Monthly impact: +$${(savedCostPerDrink * qtySold30d).toFixed(0)}.`;
  } else if (costGap > 0 && currentMarginPct < MIN_ACCEPTABLE_MARGIN_PCT) {
    // Margin too low — raise price
    const suggestedPrice = Math.ceil((totalCost / (1 - TARGET_MARGIN_PCT / 100)) * 4) / 4; // round to nearest $0.25
    const priceGain = suggestedPrice - currentPrice;
    monthlySavingsPerDrink = priceGain;
    opportunity_type = "price_increase";
    opportunity_label = "Price is too low for cost";
    suggested_tweak = `${drinkName} costs $${totalCost.toFixed(2)} to make but sells for $${currentPrice.toFixed(2)} — only ${currentMarginPct.toFixed(1)}% margin. Raise to $${suggestedPrice.toFixed(2)} to hit 70% margin. Monthly revenue gain: +$${(priceGain * qtySold30d).toFixed(0)}.`;
  } else {
    // Moderate underperformance — general guidance
    opportunity_type = "reduce_spec";
    monthlySavingsPerDrink = costGap;
    opportunity_label = "Below target margin";
    suggested_tweak = `${drinkName} is at ${currentMarginPct.toFixed(1)}% margin, below the 70% target. Consider a small price increase of $0.50–$1.00 or review the spec for any substitution opportunities.`;
  }

  return {
    drink_name: drinkName,
    current_margin_pct: Math.round(currentMarginPct * 10) / 10,
    target_margin_pct: TARGET_MARGIN_PCT,
    current_cost_usd: Math.round(totalCost * 100) / 100,
    opportunity_type,
    opportunity_label,
    highest_cost_ingredient: topIngredient?.ingredient_name ?? "Unknown",
    highest_cost_ingredient_pct: Math.round(topIngredientPct * 10) / 10,
    monthly_impact_usd: Math.round(monthlySavingsPerDrink * qtySold30d * 100) / 100,
    qty_sold_30d: qtySold30d,
    suggested_tweak,
  };
}
