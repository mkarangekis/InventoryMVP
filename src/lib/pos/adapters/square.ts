import {
  DateRange,
  PosAdapter,
  PosMenuItem,
  PosModifier,
  PosOrder,
  PosOrderItem,
  PosVoidComp,
} from "./adapter";

type SquareMoney = { amount: number; currency: string } | null | undefined;
const centsToUsd = (money: SquareMoney) =>
  money?.amount != null ? money.amount / 100 : 0;

type SquareCatalogItem = {
  id: string;
  item_data?: { name?: string };
  type?: string;
};

type SquareOrderLineItem = {
  uid: string;
  catalog_object_id?: string;
  name?: string;
  quantity?: string;
  base_price_money?: SquareMoney;
  gross_sales_money?: SquareMoney;
  variation_name?: string;
  modifiers?: Array<{
    uid: string;
    name?: string;
    base_price_money?: SquareMoney;
  }>;
};

type SquareRefundLineItem = {
  uid: string;
  name?: string;
  quantity?: string;
  total_money?: SquareMoney;
};

type SquareOrder = {
  id: string;
  created_at?: string;
  closed_at?: string;
  state?: string;
  line_items?: SquareOrderLineItem[];
  refunds?: Array<{
    line_items?: SquareRefundLineItem[];
    reason?: string;
  }>;
  total_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  net_amounts?: { total_money?: SquareMoney; tax_money?: SquareMoney };
};

const SQUARE_API_BASE = "https://connect.squareup.com/v2";

export type SquareCredentials = {
  accessToken: string;
  squareLocationId: string;
};

export class SquareAdapter implements PosAdapter {
  private orders: SquareOrder[] | null = null;
  private range: DateRange | null = null;

  constructor(private readonly creds: SquareCredentials) {}

  private async fetchOrders(dateRange: DateRange): Promise<SquareOrder[]> {
    if (this.orders && this.range?.from === dateRange.from && this.range?.to === dateRange.to) {
      return this.orders;
    }

    const all: SquareOrder[] = [];
    let cursor: string | undefined;

    do {
      const body: Record<string, unknown> = {
        location_ids: [this.creds.squareLocationId],
        query: {
          filter: {
            date_time_filter: {
              closed_at: {
                start_at: `${dateRange.from}T00:00:00Z`,
                end_at: `${dateRange.to}T23:59:59Z`,
              },
            },
            state_filter: { states: ["COMPLETED"] },
          },
        },
        limit: 500,
      };
      if (cursor) body.cursor = cursor;

      const res = await fetch(`${SQUARE_API_BASE}/orders/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.creds.accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Square orders/search failed ${res.status}: ${text}`);
      }

      const data = await res.json();
      all.push(...(data.orders ?? []));
      cursor = data.cursor;
    } while (cursor);

    this.orders = all;
    this.range = dateRange;
    return all;
  }

  async listMenuItems(): Promise<PosMenuItem[]> {
    // Catalog items require a separate call; derive from order line items instead
    // to avoid needing catalog read permission
    if (!this.orders) return [];
    const unique = new Map<string, PosMenuItem>();
    for (const order of this.orders) {
      for (const item of order.line_items ?? []) {
        const id = item.catalog_object_id ?? item.uid;
        const name = item.name ?? "Unknown";
        if (!unique.has(id)) unique.set(id, { posMenuItemId: id, name });
      }
    }
    return Array.from(unique.values());
  }

  async importOrders(dateRange: DateRange): Promise<PosOrder[]> {
    const orders = await this.fetchOrders(dateRange);
    return orders.map((o) => ({
      posOrderId: o.id,
      openedAt: o.created_at ?? o.closed_at ?? "",
      closedAt: o.closed_at ?? o.created_at ?? "",
      subtotal: centsToUsd(o.net_amounts?.total_money) - centsToUsd(o.net_amounts?.tax_money),
      tax: centsToUsd(o.total_tax_money ?? o.net_amounts?.tax_money),
      total: centsToUsd(o.total_money ?? o.net_amounts?.total_money),
      status: (o.state ?? "COMPLETED").toLowerCase(),
    }));
  }

  async importOrderItems(dateRange: DateRange): Promise<PosOrderItem[]> {
    const orders = await this.fetchOrders(dateRange);
    const items: PosOrderItem[] = [];
    for (const order of orders) {
      for (const item of order.line_items ?? []) {
        items.push({
          posItemId: `${order.id}:${item.uid}`,
          posOrderId: order.id,
          posMenuItemId: item.catalog_object_id ?? item.uid,
          itemName: item.variation_name ? `${item.name} - ${item.variation_name}` : (item.name ?? ""),
          quantity: Math.round(parseFloat(item.quantity ?? "1")),
          priceEach: centsToUsd(item.base_price_money ?? item.gross_sales_money),
        });
      }
    }
    return items;
  }

  async importModifiers(dateRange: DateRange): Promise<PosModifier[]> {
    const orders = await this.fetchOrders(dateRange);
    const mods: PosModifier[] = [];
    for (const order of orders) {
      for (const item of order.line_items ?? []) {
        for (const mod of item.modifiers ?? []) {
          mods.push({
            posItemId: `${order.id}:${item.uid}`,
            name: mod.name ?? "",
            priceDelta: centsToUsd(mod.base_price_money),
          });
        }
      }
    }
    return mods;
  }

  async importVoidsComps(dateRange: DateRange): Promise<PosVoidComp[]> {
    const orders = await this.fetchOrders(dateRange);
    const voids: PosVoidComp[] = [];
    for (const order of orders) {
      for (const refund of order.refunds ?? []) {
        for (const item of refund.line_items ?? []) {
          voids.push({
            posItemId: item.uid,
            type: "void",
            reason: refund.reason ?? null,
            amount: centsToUsd(item.total_money),
          });
        }
      }
    }
    return voids;
  }
}
