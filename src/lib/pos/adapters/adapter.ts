export type DateRange = {
  from: string;
  to: string;
};

export type PosOrder = {
  posOrderId: string;
  openedAt: string;
  closedAt: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
};

export type PosOrderItem = {
  posItemId: string;
  posOrderId: string;
  posMenuItemId: string;
  itemName: string;
  quantity: number;
  priceEach: number;
};

export type PosModifier = {
  posItemId: string;
  name: string;
  priceDelta: number;
};

export type PosVoidComp = {
  posItemId: string;
  type: string;
  reason: string | null;
  amount: number;
};

export type PosMenuItem = {
  posMenuItemId: string;
  name: string;
};

export interface PosAdapter {
  listMenuItems(): Promise<PosMenuItem[]>;
  importOrders(dateRange: DateRange): Promise<PosOrder[]>;
  importOrderItems(dateRange: DateRange): Promise<PosOrderItem[]>;
  importModifiers(dateRange: DateRange): Promise<PosModifier[]>;
  importVoidsComps(dateRange: DateRange): Promise<PosVoidComp[]>;
}