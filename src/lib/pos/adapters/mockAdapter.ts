import {
  DateRange,
  PosAdapter,
  PosMenuItem,
  PosModifier,
  PosOrder,
  PosOrderItem,
  PosVoidComp,
} from "./adapter";

const sampleOrders: PosOrder[] = [
  {
    posOrderId: "order_1001",
    openedAt: "2026-01-10T18:05:00Z",
    closedAt: "2026-01-10T18:15:00Z",
    subtotal: 36,
    tax: 3.24,
    total: 39.24,
    status: "closed",
  },
];

const sampleItems: PosOrderItem[] = [
  {
    posItemId: "item_2001",
    posOrderId: "order_1001",
    posMenuItemId: "menu_3001",
    itemName: "Old Fashioned",
    quantity: 2,
    priceEach: 12,
  },
];

const sampleModifiers: PosModifier[] = [
  {
    posItemId: "item_2001",
    name: "Large cube",
    priceDelta: 0,
  },
];

const sampleVoidsComps: PosVoidComp[] = [
  {
    posItemId: "item_2001",
    type: "comp",
    reason: "VIP",
    amount: 12,
  },
];

export class MockAdapter implements PosAdapter {
  async listMenuItems(): Promise<PosMenuItem[]> {
    return [
      {
        posMenuItemId: "menu_3001",
        name: "Old Fashioned",
      },
    ];
  }

  async importOrders(_dateRange: DateRange): Promise<PosOrder[]> {
    return sampleOrders;
  }

  async importOrderItems(_dateRange: DateRange): Promise<PosOrderItem[]> {
    return sampleItems;
  }

  async importModifiers(_dateRange: DateRange): Promise<PosModifier[]> {
    return sampleModifiers;
  }

  async importVoidsComps(_dateRange: DateRange): Promise<PosVoidComp[]> {
    return sampleVoidsComps;
  }
}