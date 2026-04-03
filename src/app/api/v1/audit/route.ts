import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";

export async function GET(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  if (scope.isDemo) {
    const { demoAuditLogs } = await import("@/lib/demo");
    return NextResponse.json(demoAuditLogs);
  }

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");

  let query = supabaseAdmin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, details, location_id, user_id, created_at, user_profiles(email)", { count: "exact" })
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (locationId) query = query.eq("location_id", locationId);
  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compliance: log that audit trail was accessed
  void supabaseAdmin.from("audit_logs").insert({
    tenant_id: scope.tenantId,
    location_id: locationId ?? null,
    user_id: scope.userId,
    action: "audit.viewed",
    entity_type: "audit_logs",
    details: { filters: { action, entityType, locationId }, limit, offset },
  });

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
