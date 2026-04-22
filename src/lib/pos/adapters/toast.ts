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

// Toast Hub SFTP nightly export format
// OrderDetails.csv + ItemSelectionDetails.csv
export type ToastPayloads = {
  orders: string;      // OrderDetails.csv
  items: string;       // ItemSelectionDetails.csv
};

export class ToastAdapter implements PosAdapter {
  constructor(private readonly payloads: ToastPayloads) {}

  async listMenuItems(): Promise<PosMenuItem[]> {
    const { rows } = parseCsv(this.payloads.items, ["Item Id", "Menu Item"]);
    const unique = new Map<string, PosMenuItem>();
    for (const row of rows) {
      const id = row["Item Id"];
      const name = row["Menu Item"];
      if (id && name && !unique.has(id)) {
        unique.set(id, { posMenuItemId: id, name });
      }
    }
    return Array.from(unique.values());
  }

  async importOrders(_dateRange: DateRange): Promise<PosOrder[]> {
    const { rows } = parseCsv(this.payloads.orders, [
      "Order Id",
      "Opened",
    ]);

    return rows
      .filter((row) => row["Void"]?.toLowerCase() !== "true")
      .map((row) => ({
        posOrderId: row["Order Id"],
        openedAt: row["Opened"] ?? "",
        closedAt: row["Paid Date"] ?? row["Closed Date"] ?? row["Opened"] ?? "",
        subtotal: parseNumber(row["Subtotal"]),
        tax: parseNumber(row["Tax"]),
        total: parseNumber(row["Total Amount"] ?? row["Total"]),
        status: row["Order Status"] ?? "closed",
      }));
  }

  async importOrderItems(_dateRange: DateRange): Promise<PosOrderItem[]> {
    const { rows } = parseCsv(this.payloads.items, [
      "Selection GUID",
      "Order Id",
      "Item Id",
      "Menu Item",
      "Qty",
    ]);

    // Top-level items: no Parent Menu Selection Guid (or it's empty)
    return rows
      .filter(
        (row) =>
          !row["Parent Menu Selection Guid"] &&
          row["Void"]?.toLowerCase() !== "true" &&
          row["Deferred"]?.toLowerCase() !== "true",
      )
      .map((row) => ({
        posItemId: row["Selection GUID"],
        posOrderId: row["Order Id"],
        posMenuItemId: row["Item Id"],
        itemName: row["Menu Item"],
        quantity: Math.round(parseNumber(row["Qty"]) || 1),
        priceEach: parseNumber(row["Gross Price"] ?? row["Net Price"]),
      }));
  }

  async importModifiers(_dateRange: DateRange): Promise<PosModifier[]> {
    const { rows } = parseCsv(this.payloads.items, [
      "Selection GUID",
      "Parent Menu Selection Guid",
      "Menu Item",
    ]);

    // Child rows: have a Parent Menu Selection Guid
    return rows
      .filter((row) => !!row["Parent Menu Selection Guid"])
      .map((row) => ({
        posItemId: row["Parent Menu Selection Guid"],
        name: row["Menu Item"],
        priceDelta: parseNumber(row["Gross Price"] ?? row["Net Price"]),
      }));
  }

  async importVoidsComps(_dateRange: DateRange): Promise<PosVoidComp[]> {
    const { rows } = parseCsv(this.payloads.items, [
      "Selection GUID",
      "Void",
    ]);

    return rows
      .filter((row) => row["Void"]?.toLowerCase() === "true")
      .map((row) => ({
        posItemId: row["Selection GUID"],
        type: "void",
        reason: null,
        amount: parseNumber(row["Gross Price"] ?? row["Net Price"]),
      }));
  }
}
