/**
 * Dead SKU Detector
 *
 * Identifies menu items with zero or near-zero sales velocity and calculates
 * the carrying cost of the inventory tied up in those items. Recommends
 * whether to cut, run as a special to clear stock, or substitute.
 */

export type DeadSkuSignal = "dead" | "dying" | "seasonal_mismatch" | "healthy";

export type DeadSkuItem = {
  menu_item_id: string;
  name: string;
  category: string | null;
  qty_sold_30d: number;
  qty_sold_60d: number;
  qty_sold_90d: number;
  current_price: number;
  cost_per_serving: number;
  estimated_inventory_on_hand_usd: number; // money tied up in stock
  signal: DeadSkuSignal;
  signal_label: string;          // plain English for the owner
  recommendation: string;
  monthly_carrying_cost_usd: number; // cost of holding this dead stock
};

const CARRYING_COST_RATE = 0.02; // 2% of inventory value per month (storage, spoilage, opportunity cost)

export function scoreDeadSku(
  menuItemId: string,
  name: string,
  category: string | null,
  currentPrice: number,
  costPerServing: number,
  qtySold30d: number,
  qtySold60d: number,
  qtySold90d: number,
  estimatedOnHandUnits: number,
  currentSeason: string,
): DeadSkuItem {
  const inventoryValueUsd = estimatedOnHandUnits * costPerServing;
  const monthlyCarryingCost = Math.round(inventoryValueUsd * CARRYING_COST_RATE * 100) / 100;

  // Detect seasonal mismatch (e.g., pumpkin cocktail in May)
  const nameLower = name.toLowerCase();
  const isSeasonal = (
    (nameLower.includes("pumpkin") || nameLower.includes("spiced apple") || nameLower.includes("harvest")) && currentSeason !== "fall" ||
    (nameLower.includes("eggnog") || nameLower.includes("peppermint") || nameLower.includes("mulled")) && currentSeason !== "winter" ||
    (nameLower.includes("watermelon") || nameLower.includes("frozen") || nameLower.includes("tropical")) && currentSeason !== "summer" ||
    (nameLower.includes("rose") || nameLower.includes("elderflower") || nameLower.includes("garden")) && currentSeason !== "spring"
  );

  let signal: DeadSkuSignal;
  let signal_label: string;
  let recommendation: string;

  if (qtySold90d === 0) {
    signal = "dead";
    signal_label = "Not ordered in 90 days";
    recommendation = inventoryValueUsd > 50
      ? `Remove from menu. You have ~$${inventoryValueUsd.toFixed(0)} of ${name} ingredients sitting unused — run as a bartender's special this week to clear stock, then cut it.`
      : `Remove from menu. No orders in 90 days and minimal stock on hand.`;
  } else if (qtySold30d === 0 && qtySold60d <= 2) {
    signal = "dying";
    signal_label = "Almost never ordered";
    recommendation = `Consider removing. Only ${qtySold60d} orders in 60 days. If keeping, move it to a 'specials' section rather than the main menu to reduce cognitive load for guests.`;
  } else if (isSeasonal && qtySold30d <= 2) {
    signal = "seasonal_mismatch";
    signal_label = "Out of season";
    recommendation = `This looks like a seasonal item that's still on the menu out of season. Remove or replace with a current-season equivalent to keep the menu fresh.`;
  } else {
    signal = "healthy";
    signal_label = "Selling normally";
    recommendation = "No action needed.";
  }

  return {
    menu_item_id: menuItemId,
    name,
    category,
    qty_sold_30d: qtySold30d,
    qty_sold_60d: qtySold60d,
    qty_sold_90d: qtySold90d,
    current_price: currentPrice,
    cost_per_serving: costPerServing,
    estimated_inventory_on_hand_usd: Math.round(inventoryValueUsd * 100) / 100,
    signal,
    signal_label,
    recommendation,
    monthly_carrying_cost_usd: monthlyCarryingCost,
  };
}
