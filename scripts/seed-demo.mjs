import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

const env = {};
if (fs.existsSync(envPath)) {
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    env[key.trim()] = rest.join("=").trim();
  }
}

const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars. Ensure .env.local is present.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const nowIso = () => new Date().toISOString();

const safeSingle = async (query, errorContext) => {
  const { data, error } = await query;
  if (error) {
    throw new Error(`${errorContext}: ${error.message}`);
  }
  return data;
};

const ensureUser = async (email, password) => {
  const list = await supabase.auth.admin.listUsers();
  if (list.error) {
    throw new Error(`listUsers failed: ${list.error.message}`);
  }

  const existing = list.data.users.find((user) => user.email === email);
  if (existing) {
    return existing;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error || !created.data.user) {
    throw new Error(`createUser failed: ${created.error?.message}`);
  }

  return created.data.user;
};

const ensureTenant = async (name) => {
  const existing = await supabase
    .from("tenants")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase.from("tenants").insert({ name }).select("id").single(),
    "insert tenant",
  );

  return inserted.id;
};

const ensureLocation = async (tenantId, payload) => {
  const existing = await supabase
    .from("locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", payload.name)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("locations")
      .insert({ tenant_id: tenantId, ...payload })
      .select("id")
      .single(),
    "insert location",
  );

  return inserted.id;
};

const ensureProfile = async (userId, tenantId, email) => {
  const existing = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  await safeSingle(
    supabase.from("user_profiles").insert({
      id: userId,
      tenant_id: tenantId,
      email,
      role: "owner",
    }),
    "insert user profile",
  );

  return userId;
};

const ensureUserLocation = async (userId, locationId) => {
  const existing = await supabase
    .from("user_locations")
    .select("user_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (existing.data?.user_id) {
    return;
  }

  await safeSingle(
    supabase.from("user_locations").insert({
      user_id: userId,
      location_id: locationId,
    }),
    "insert user location",
  );
};

const ensureIngredient = async (tenantId, ingredient) => {
  const existing = await supabase
    .from("ingredients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", ingredient.name)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("ingredients")
      .insert({ tenant_id: tenantId, ...ingredient })
      .select("id")
      .single(),
    "insert ingredient",
  );

  return inserted.id;
};

const ensureIngredientCost = async (tenantId, ingredientId, costPerOz) => {
  const existing = await supabase
    .from("ingredient_costs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("ingredient_id", ingredientId)
    .is("effective_to", null)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("ingredient_costs")
      .insert({
        tenant_id: tenantId,
        ingredient_id: ingredientId,
        cost_per_oz: costPerOz,
        effective_from: nowIso(),
      })
      .select("id")
      .single(),
    "insert ingredient cost",
  );

  return inserted.id;
};

const ensureInventoryItem = async (tenantId, locationId, ingredientId, item) => {
  const existing = await supabase
    .from("inventory_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("inventory_items")
      .insert({
        tenant_id: tenantId,
        location_id: locationId,
        ingredient_id: ingredientId,
        ...item,
      })
      .select("id")
      .single(),
    "insert inventory item",
  );

  return inserted.id;
};

const ensureVendor = async (tenantId, vendor) => {
  const existing = await supabase
    .from("vendors")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", vendor.name)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("vendors")
      .insert({ tenant_id: tenantId, ...vendor })
      .select("id")
      .single(),
    "insert vendor",
  );

  return inserted.id;
};

const ensureVendorItem = async (tenantId, vendorId, inventoryItemId, item) => {
  const existing = await supabase
    .from("vendor_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("vendor_id", vendorId)
    .eq("inventory_item_id", inventoryItemId)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("vendor_items")
      .insert({
        tenant_id: tenantId,
        vendor_id: vendorId,
        inventory_item_id: inventoryItemId,
        ...item,
      })
      .select("id")
      .single(),
    "insert vendor item",
  );

  return inserted.id;
};

const ensureReorderPolicy = async (
  tenantId,
  locationId,
  inventoryItemId,
  policy,
) => {
  const existing = await supabase
    .from("reorder_policies")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("inventory_item_id", inventoryItemId)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("reorder_policies")
      .insert({
        tenant_id: tenantId,
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        ...policy,
      })
      .select("id")
      .single(),
    "insert reorder policy",
  );

  return inserted.id;
};

const ensureMenuItem = async (tenantId, locationId, item) => {
  const existing = await supabase
    .from("menu_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("pos_menu_item_id", item.pos_menu_item_id)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("menu_items")
      .insert({ tenant_id: tenantId, location_id: locationId, ...item })
      .select("id")
      .single(),
    "insert menu item",
  );

  return inserted.id;
};

const ensureDrinkSpec = async (tenantId, locationId, menuItemId, spec) => {
  const existing = await supabase
    .from("drink_specs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("menu_item_id", menuItemId)
    .eq("active", 1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("drink_specs")
      .insert({
        tenant_id: tenantId,
        location_id: locationId,
        menu_item_id: menuItemId,
        ...spec,
      })
      .select("id")
      .single(),
    "insert drink spec",
  );

  return inserted.id;
};

const ensureDrinkSpecLine = async (
  tenantId,
  drinkSpecId,
  ingredientId,
  ounces,
) => {
  const existing = await supabase
    .from("drink_spec_lines")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("drink_spec_id", drinkSpecId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("drink_spec_lines")
      .insert({
        tenant_id: tenantId,
        drink_spec_id: drinkSpecId,
        ingredient_id: ingredientId,
        ounces,
      })
      .select("id")
      .single(),
    "insert drink spec line",
  );

  return inserted.id;
};

const ensurePosOrder = async (tenantId, locationId, order) => {
  const existing = await supabase
    .from("pos_orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("pos_order_id", order.pos_order_id)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("pos_orders")
      .insert({ tenant_id: tenantId, location_id: locationId, ...order })
      .select("id")
      .single(),
    "insert pos order",
  );

  return inserted.id;
};

const ensurePosOrderItem = async (tenantId, locationId, item) => {
  const existing = await supabase
    .from("pos_order_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("pos_item_id", item.pos_item_id)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("pos_order_items")
      .insert({ tenant_id: tenantId, location_id: locationId, ...item })
      .select("id")
      .single(),
    "insert pos order item",
  );

  return inserted.id;
};

const ensureModifier = async (tenantId, locationId, modifier) => {
  const existing = await supabase
    .from("pos_modifiers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("pos_item_id", modifier.pos_item_id)
    .eq("name", modifier.name)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("pos_modifiers")
      .insert({ tenant_id: tenantId, location_id: locationId, ...modifier })
      .select("id")
      .single(),
    "insert modifier",
  );

  return inserted.id;
};

const ensureVoidComp = async (tenantId, locationId, row) => {
  const existing = await supabase
    .from("pos_voids_comps")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("pos_item_id", row.pos_item_id)
    .eq("type", row.type)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await safeSingle(
    supabase
      .from("pos_voids_comps")
      .insert({ tenant_id: tenantId, location_id: locationId, ...row })
      .select("id")
      .single(),
    "insert void/comp",
  );

  return inserted.id;
};

const run = async () => {
  const email = "demo@bar.local";
  const password = "Password123!";
  const user = await ensureUser(email, password);

  const tenantId = await ensureTenant("Demo Bar Group");
  const locationId = await ensureLocation(tenantId, {
    name: "Demo Midtown",
    address: "123 Main St, NY",
    timezone: "America/New_York",
  });
  const locationId2 = await ensureLocation(tenantId, {
    name: "Demo Uptown",
    address: "456 Uptown Ave, NY",
    timezone: "America/New_York",
  });

  await ensureProfile(user.id, tenantId, email);
  await ensureUserLocation(user.id, locationId);
  await ensureUserLocation(user.id, locationId2);

  const ingredientList = [
    { name: "Bourbon", type: "spirit", default_unit_oz: 1.0 },
    { name: "Rye Whiskey", type: "spirit", default_unit_oz: 1.0 },
    { name: "Sweet Vermouth", type: "wine", default_unit_oz: 1.0 },
    { name: "Aromatic Bitters", type: "other", default_unit_oz: 0.25 },
    { name: "Tequila Blanco", type: "spirit", default_unit_oz: 1.0 },
    { name: "Triple Sec", type: "spirit", default_unit_oz: 1.0 },
    { name: "Lime Juice", type: "mixer", default_unit_oz: 1.0 },
  ];

  const ingredientIds = {};
  for (const ingredient of ingredientList) {
    const ingredientId = await ensureIngredient(tenantId, ingredient);
    ingredientIds[ingredient.name] = ingredientId;
  }

  await ensureIngredientCost(tenantId, ingredientIds["Bourbon"], 0.9);
  await ensureIngredientCost(tenantId, ingredientIds["Rye Whiskey"], 0.85);
  await ensureIngredientCost(tenantId, ingredientIds["Sweet Vermouth"], 0.4);
  await ensureIngredientCost(tenantId, ingredientIds["Aromatic Bitters"], 0.1);
  await ensureIngredientCost(tenantId, ingredientIds["Tequila Blanco"], 0.8);
  await ensureIngredientCost(tenantId, ingredientIds["Triple Sec"], 0.35);
  await ensureIngredientCost(tenantId, ingredientIds["Lime Juice"], 0.25);

  const inventoryItems = [
    {
      ingredient: "Bourbon",
      container_type: "bottle",
      container_size_oz: 25.4,
      name_override: null,
    },
    {
      ingredient: "Rye Whiskey",
      container_type: "bottle",
      container_size_oz: 25.4,
      name_override: null,
    },
    {
      ingredient: "Tequila Blanco",
      container_type: "bottle",
      container_size_oz: 25.4,
      name_override: null,
    },
    {
      ingredient: "Triple Sec",
      container_type: "bottle",
      container_size_oz: 25.4,
      name_override: null,
    },
    {
      ingredient: "Lime Juice",
      container_type: "bottle",
      container_size_oz: 32,
      name_override: null,
    },
  ];

  const inventoryItemIds = {};
  for (const item of inventoryItems) {
    const id = await ensureInventoryItem(
      tenantId,
      locationId,
      ingredientIds[item.ingredient],
      {
        name_override: item.name_override,
        container_type: item.container_type,
        container_size_oz: item.container_size_oz,
        is_active: 1,
      },
    );
    inventoryItemIds[item.ingredient] = id;
  }
  const inventoryItemIds2 = {};
  for (const item of inventoryItems) {
    const id = await ensureInventoryItem(
      tenantId,
      locationId2,
      ingredientIds[item.ingredient],
      {
        name_override: item.name_override,
        container_type: item.container_type,
        container_size_oz: item.container_size_oz,
        is_active: 1,
      },
    );
    inventoryItemIds2[item.ingredient] = id;
  }

  const vendorId = await ensureVendor(tenantId, {
    name: "Metro Spirits",
    email: "orders@metrospirits.test",
    phone: "555-0100",
  });

  await ensureVendorItem(tenantId, vendorId, inventoryItemIds["Bourbon"], {
    sku: "BRBN-1L",
    unit_size_oz: 33.8,
    unit_price: 28,
    lead_time_days: 3,
  });

  await ensureVendorItem(tenantId, vendorId, inventoryItemIds["Tequila Blanco"], {
    sku: "TEQ-1L",
    unit_size_oz: 33.8,
    unit_price: 26,
    lead_time_days: 4,
  });
  await ensureVendorItem(tenantId, vendorId, inventoryItemIds2["Bourbon"], {
    sku: "BRBN-1L",
    unit_size_oz: 33.8,
    unit_price: 29,
    lead_time_days: 3,
  });
  await ensureVendorItem(tenantId, vendorId, inventoryItemIds2["Tequila Blanco"], {
    sku: "TEQ-1L",
    unit_size_oz: 33.8,
    unit_price: 27,
    lead_time_days: 4,
  });

  await ensureReorderPolicy(tenantId, locationId, inventoryItemIds["Bourbon"], {
    reorder_point_oz: 40,
    par_level_oz: 120,
    safety_buffer_days: 2,
    lead_time_days: 3,
  });

  await ensureReorderPolicy(tenantId, locationId, inventoryItemIds["Tequila Blanco"], {
    reorder_point_oz: 35,
    par_level_oz: 100,
    safety_buffer_days: 2,
    lead_time_days: 4,
  });
  await ensureReorderPolicy(tenantId, locationId2, inventoryItemIds2["Bourbon"], {
    reorder_point_oz: 35,
    par_level_oz: 110,
    safety_buffer_days: 2,
    lead_time_days: 3,
  });
  await ensureReorderPolicy(
    tenantId,
    locationId2,
    inventoryItemIds2["Tequila Blanco"],
    {
      reorder_point_oz: 30,
      par_level_oz: 95,
      safety_buffer_days: 2,
      lead_time_days: 4,
    },
  );

  const oldFashionedId = await ensureMenuItem(tenantId, locationId, {
    pos_menu_item_id: "menu_3001",
    name: "Old Fashioned",
    category: "Cocktails",
    base_price: 12.0,
    is_active: 1,
  });

  const margaritaId = await ensureMenuItem(tenantId, locationId, {
    pos_menu_item_id: "menu_3002",
    name: "Margarita",
    category: "Cocktails",
    base_price: 12.0,
    is_active: 1,
  });
  const oldFashionedId2 = await ensureMenuItem(tenantId, locationId2, {
    pos_menu_item_id: "menu_4001",
    name: "Old Fashioned",
    category: "Cocktails",
    base_price: 13.0,
    is_active: 1,
  });
  const margaritaId2 = await ensureMenuItem(tenantId, locationId2, {
    pos_menu_item_id: "menu_4002",
    name: "Margarita",
    category: "Cocktails",
    base_price: 13.0,
    is_active: 1,
  });

  const oldFashionedSpecId = await ensureDrinkSpec(
    tenantId,
    locationId,
    oldFashionedId,
    {
      version: 1,
      glass_type: "rocks",
      ice_type: "large cube",
      target_pour_oz: 2.5,
      notes: "Signature old fashioned",
      active: 1,
    },
  );

  const margaritaSpecId = await ensureDrinkSpec(
    tenantId,
    locationId,
    margaritaId,
    {
      version: 1,
      glass_type: "coupe",
      ice_type: "none",
      target_pour_oz: 3.0,
      notes: "House margarita",
      active: 1,
    },
  );

  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId,
    ingredientIds["Bourbon"],
    2,
  );
  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId,
    ingredientIds["Sweet Vermouth"],
    0.5,
  );
  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId,
    ingredientIds["Aromatic Bitters"],
    0.1,
  );

  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId,
    ingredientIds["Tequila Blanco"],
    2,
  );
  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId,
    ingredientIds["Triple Sec"],
    0.5,
  );
  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId,
    ingredientIds["Lime Juice"],
    0.75,
  );

  const oldFashionedSpecId2 = await ensureDrinkSpec(
    tenantId,
    locationId2,
    oldFashionedId2,
    {
      version: 1,
      glass_type: "rocks",
      ice_type: "large cube",
      target_pour_oz: 2.25,
      notes: "Uptown spec",
      active: 1,
    },
  );
  const margaritaSpecId2 = await ensureDrinkSpec(
    tenantId,
    locationId2,
    margaritaId2,
    {
      version: 1,
      glass_type: "coupe",
      ice_type: "none",
      target_pour_oz: 2.75,
      notes: "Uptown spec",
      active: 1,
    },
  );

  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId2,
    ingredientIds["Bourbon"],
    1.75,
  );
  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId2,
    ingredientIds["Sweet Vermouth"],
    0.5,
  );
  await ensureDrinkSpecLine(
    tenantId,
    oldFashionedSpecId2,
    ingredientIds["Aromatic Bitters"],
    0.1,
  );

  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId2,
    ingredientIds["Tequila Blanco"],
    1.75,
  );
  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId2,
    ingredientIds["Triple Sec"],
    0.5,
  );
  await ensureDrinkSpecLine(
    tenantId,
    margaritaSpecId2,
    ingredientIds["Lime Juice"],
    0.75,
  );

  await ensurePosOrder(tenantId, locationId, {
    pos_order_id: "order_1001",
    opened_at: "2026-01-10T18:05:00Z",
    closed_at: "2026-01-10T18:15:00Z",
    subtotal: 36.0,
    tax: 3.24,
    total: 39.24,
    status: "closed",
  });

  await ensurePosOrder(tenantId, locationId, {
    pos_order_id: "order_1002",
    opened_at: "2026-01-10T19:05:00Z",
    closed_at: "2026-01-10T19:40:00Z",
    subtotal: 24.0,
    tax: 2.16,
    total: 26.16,
    status: "closed",
  });

  await ensurePosOrderItem(tenantId, locationId, {
    pos_item_id: "item_2001",
    pos_order_id: "order_1001",
    menu_item_id: oldFashionedId,
    name: "Old Fashioned",
    quantity: 2,
    price_each: 12,
    gross: 24,
  });

  await ensurePosOrderItem(tenantId, locationId, {
    pos_item_id: "item_2002",
    pos_order_id: "order_1002",
    menu_item_id: margaritaId,
    name: "Margarita",
    quantity: 2,
    price_each: 12,
    gross: 24,
  });

  await ensureModifier(tenantId, locationId, {
    pos_item_id: "item_2001",
    name: "Large cube",
    price_delta: 0,
  });

  await ensureVoidComp(tenantId, locationId, {
    pos_item_id: "item_2002",
    type: "comp",
    reason: "VIP",
    amount: 12,
  });

  await ensurePosOrder(tenantId, locationId2, {
    pos_order_id: "order_2001",
    opened_at: "2026-01-11T18:05:00Z",
    closed_at: "2026-01-11T18:20:00Z",
    subtotal: 39.0,
    tax: 3.51,
    total: 42.51,
    status: "closed",
  });
  await ensurePosOrder(tenantId, locationId2, {
    pos_order_id: "order_2002",
    opened_at: "2026-01-11T19:10:00Z",
    closed_at: "2026-01-11T19:45:00Z",
    subtotal: 26.0,
    tax: 2.34,
    total: 28.34,
    status: "closed",
  });

  await ensurePosOrderItem(tenantId, locationId2, {
    pos_item_id: "item_3001",
    pos_order_id: "order_2001",
    menu_item_id: oldFashionedId2,
    name: "Old Fashioned",
    quantity: 2,
    price_each: 13,
    gross: 26,
  });
  await ensurePosOrderItem(tenantId, locationId2, {
    pos_item_id: "item_3002",
    pos_order_id: "order_2001",
    menu_item_id: margaritaId2,
    name: "Margarita",
    quantity: 1,
    price_each: 13,
    gross: 13,
  });
  await ensurePosOrderItem(tenantId, locationId2, {
    pos_item_id: "item_3003",
    pos_order_id: "order_2002",
    menu_item_id: margaritaId2,
    name: "Margarita",
    quantity: 1,
    price_each: 13,
    gross: 13,
  });

  console.log("Demo seed complete");
  console.log({ tenantId, locationId, userId: user.id, email, password });
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
