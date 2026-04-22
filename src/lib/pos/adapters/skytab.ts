import {
  DateRange,
  PosAdapter,
  PosMenuItem,
  PosModifier,
  PosOrder,
  PosOrderItem,
  PosVoidComp,
} from "./adapter";
import { parseCsv } from "../csv";

const parseNumber = (value: string | undefined) => {
  const parsed = Number.parseFloat((value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

// SkyTab Lighthouse email export — single combined report CSV
// Each row is one order item with check-level totals repeated
// Column names vary between Lighthouse versions; try multiple aliases
export type SkyTabPayloads = {
  report: string;
};

function col(row: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== "") return row[a];
  }
  return "";
}

export class SkyTabAdapter implements PosAdapter {
  constructor(private readonly payloads: SkyTabPayloads) {}

  async listMenuItems(): Promise<PosMenuItem[]> {
    const { rows } = parseCsv(this.payloads.report, []);
    const unique = new Map<string, PosMenuItem>();
    for (const row of rows) {
      const id = col(row, "Menu Item ID", "Item ID", "PLU", "Item Code");
      const name = col(row, "Menu Item", "Item Name", "Item");
      if (id && name && !unique.has(id)) {
        unique.set(id, { posMenuItemId: id, name });
      }
    }
    return Array.from(unique.values());
  }

  async importOrders(_dateRange: DateRange): Promise<PosOrder[]> {
    const { rows } = parseCsv(this.payloads.report, []);

    // Group rows by check number to get one order per check
    const orders = new Map<string, PosOrder>();
    for (const row of rows) {
      const checkId = col(row, "Check #", "Check Number", "Ticket #", "Order #");
      if (!checkId || orders.has(checkId)) continue;

      const voidFlag = col(row, "Void", "Voided");
      if (voidFlag?.toLowerCase() === "true" || voidFlag === "1") continue;

      const openedAt = col(row, "Date/Time Opened", "Opened", "Open Time", "Date Opened");
      const closedAt = col(row, "Date/Time Closed", "Closed", "Close Time", "Date Closed", "Date Paid");

      orders.set(checkId, {
        posOrderId: checkId,
        openedAt: openedAt || closedAt,
        closedAt: closedAt || openedAt,
        subtotal: parseNumber(col(row, "Sub Total", "Subtotal", "Net Sales", "Sale Amount")),
        tax: parseNumber(col(row, "Tax", "Tax Amount", "Sales Tax")),
        total: parseNumber(col(row, "Total", "Check Total", "Total Amount", "Grand Total")),
        status: "closed",
      });
    }

    return Array.from(orders.values());
  }

  async importOrderItems(_dateRange: DateRange): Promise<PosOrderItem[]> {
    const { rows } = parseCsv(this.payloads.report, []);
    const seen = new Set<string>();
    const items: PosOrderItem[] = [];

    rows.forEach((row, index) => {
      const checkId = col(row, "Check #", "Check Number", "Ticket #", "Order #");
      const itemId = col(row, "Menu Item ID", "Item ID", "PLU", "Item Code");
      const name = col(row, "Menu Item", "Item Name", "Item");

      if (!checkId || !name) return;

      const voidFlag = col(row, "Void", "Voided");
      if (voidFlag?.toLowerCase() === "true" || voidFlag === "1") return;

      const posItemId = `${checkId}-${index}`;
      if (seen.has(posItemId)) return;
      seen.add(posItemId);

      items.push({
        posItemId,
        posOrderId: checkId,
        posMenuItemId: itemId || name,
        itemName: name,
        quantity: Math.round(parseNumber(col(row, "Qty", "Quantity", "Count")) || 1),
        priceEach: parseNumber(col(row, "Item Price", "Price", "Unit Price", "Sell Price")),
      });
    });

    return items;
  }

  async importModifiers(_dateRange: DateRange): Promise<PosModifier[]> {
    // SkyTab Lighthouse reports don't expose modifier lines in the standard
    // email export format; modifiers roll up into item price
    return [];
  }

  async importVoidsComps(_dateRange: DateRange): Promise<PosVoidComp[]> {
    const { rows } = parseCsv(this.payloads.report, []);
    const voids: PosVoidComp[] = [];

    rows.forEach((row, index) => {
      const voidFlag = col(row, "Void", "Voided");
      const compFlag = col(row, "Comp", "Comped", "Comped Amount");

      if (voidFlag?.toLowerCase() === "true" || voidFlag === "1") {
        const checkId = col(row, "Check #", "Check Number", "Ticket #");
        voids.push({
          posItemId: `${checkId}-${index}`,
          type: "void",
          reason: col(row, "Void Reason", "Reason") || null,
          amount: parseNumber(col(row, "Item Price", "Price", "Amount")),
        });
      } else if (compFlag && parseNumber(compFlag) !== 0) {
        const checkId = col(row, "Check #", "Check Number", "Ticket #");
        voids.push({
          posItemId: `${checkId}-${index}`,
          type: "comp",
          reason: null,
          amount: parseNumber(compFlag),
        });
      }
    });

    return voids;
  }
}
