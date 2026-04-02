import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";

// PATCH /api/v1/webhooks/[id] — update endpoint
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { is_active, events, description } = body as {
    is_active?: boolean;
    events?: string[];
    description?: string;
  };

  const update: Record<string, unknown> = {};
  if (typeof is_active === "boolean") update.is_active = is_active;
  if (events) update.events = events;
  if (description !== undefined) update.description = description;

  const { error } = await supabaseAdmin
    .from("webhook_endpoints")
    .update(update)
    .eq("id", params.id)
    .eq("tenant_id", scope.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/v1/webhooks/[id] — remove endpoint
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  const { error } = await supabaseAdmin
    .from("webhook_endpoints")
    .delete()
    .eq("id", params.id)
    .eq("tenant_id", scope.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
