/**
 * POST /api/onboarding/seed-inventory
 * Creates ingredients + inventory_items from the onboarding Step 3 list.
 * Items are keyed by name — duplicates are skipped (upsert-safe).
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";

type SeedItem = {
  name: string;
  unit: string; // e.g. "750ml bottle", "1L bottle", "keg", "case"
};

const UNIT_OZ: Record<string, number> = {
  "750ml bottle": 25.36,
  "1L bottle": 33.81,
  "1.75L bottle": 59.17,
  "375ml bottle": 12.68,
  "can": 12,
  "bottle": 12,
  "keg": 1984,   // half barrel
  "case": 288,   // 24x12oz
};

const guessOz = (unit: string): number =>
  UNIT_OZ[unit.toLowerCase()] ?? UNIT_OZ["750ml bottle"];

export async function POST(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  if (!scope.tenantId) return NextResponse.json({ error: "No workspace found" }, { status: 422 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { items, locationId } = body as { items?: SeedItem[]; locationId?: string };
  if (!items?.length) return NextResponse.json({ created: 0 });

  const locId = locationId ?? scope.locationId ?? scope.scopedLocationIds?.[0];
  if (!locId) return NextResponse.json({ error: "No location found" }, { status: 422 });

  const validItems = items.filter((i) => i.name?.trim());
  if (!validItems.length) return NextResponse.json({ created: 0 });

  let created = 0;

  for (const item of validItems) {
    const name = item.name.trim();
    const containerSizeOz = guessOz(item.unit);
    const containerType = item.unit;

    // Upsert ingredient (by name + tenantId)
    const { data: existingIng } = await supabaseAdmin
      .from("ingredients")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .eq("name", name)
      .maybeSingle();

    let ingredientId: string;
    if (existingIng?.id) {
      ingredientId = existingIng.id;
    } else {
      const { data: newIng, error: ingErr } = await supabaseAdmin
        .from("ingredients")
        .insert({ tenant_id: scope.tenantId, name, type: "spirit" })
        .select("id")
        .single();
      if (ingErr || !newIng) continue;
      ingredientId = newIng.id;
    }

    // Check if inventory item already exists for this location + ingredient
    const { data: existingItem } = await supabaseAdmin
      .from("inventory_items")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .eq("location_id", locId)
      .eq("ingredient_id", ingredientId)
      .maybeSingle();

    if (existingItem) continue; // skip duplicates

    const { error: itemErr } = await supabaseAdmin
      .from("inventory_items")
      .insert({
        tenant_id: scope.tenantId,
        location_id: locId,
        ingredient_id: ingredientId,
        name_override: name,
        container_type: containerType,
        container_size_oz: containerSizeOz,
        is_active: 1,
      });

    if (!itemErr) created++;
  }

  return NextResponse.json({ created });
}
