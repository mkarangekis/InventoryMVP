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

const parseNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type CsvPayloads = {
  orders: string;
  orderItems: string;
  modifiers: string;
  voidsComps: string;
};

export class CsvAdapter implements PosAdapter {
  constructor(private readonly payloads: CsvPayloads) {}

  async listMenuItems(): Promise<PosMenuItem[]> {
    const { rows } = parseCsv(this.payloads.orderItems, [
      "pos_menu_item_id",
      "item_name",
    ]);

    const unique = new Map<string, PosMenuItem>();
    for (const row of rows) {
      const posMenuItemId = row.pos_menu_item_id;
      const name = row.item_name;
      if (!posMenuItemId || !name) {
        continue;
      }
      if (!unique.has(posMenuItemId)) {
        unique.set(posMenuItemId, { posMenuItemId, name });
      }
    }

    return Array.from(unique.values());
  }

  async importOrders(_dateRange: DateRange): Promise<PosOrder[]> {
    const { rows } = parseCsv(this.payloads.orders, [
      "pos_order_id",
      "opened_at",
      "closed_at",
      "subtotal",
      "tax",
      "total",
      "status",
    ]);

    return rows.map((row) => ({
      posOrderId: row.pos_order_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      subtotal: parseNumber(row.subtotal),
      tax: parseNumber(row.tax),
      total: parseNumber(row.total),
      status: row.status,
    }));
  }

  async importOrderItems(_dateRange: DateRange): Promise<PosOrderItem[]> {
    const { rows } = parseCsv(this.payloads.orderItems, [
      "pos_item_id",
      "pos_order_id",
      "pos_menu_item_id",
      "item_name",
      "quantity",
      "price_each",
    ]);

    return rows.map((row) => ({
      posItemId: row.pos_item_id,
      posOrderId: row.pos_order_id,
      posMenuItemId: row.pos_menu_item_id,
      itemName: row.item_name,
      quantity: Number.parseInt(row.quantity ?? "0", 10),
      priceEach: parseNumber(row.price_each),
    }));
  }

  async importModifiers(_dateRange: DateRange): Promise<PosModifier[]> {
    const { rows } = parseCsv(this.payloads.modifiers, [
      "pos_item_id",
      "name",
      "price_delta",
    ]);

    return rows.map((row) => ({
      posItemId: row.pos_item_id,
      name: row.name,
      priceDelta: parseNumber(row.price_delta),
    }));
  }

  async importVoidsComps(_dateRange: DateRange): Promise<PosVoidComp[]> {
    const { rows } = parseCsv(this.payloads.voidsComps, [
      "pos_item_id",
      "type",
      "reason",
      "amount",
    ]);

    return rows.map((row) => ({
      posItemId: row.pos_item_id,
      type: row.type,
      reason: row.reason ?? null,
      amount: parseNumber(row.amount),
    }));
  }
}