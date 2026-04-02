import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";
import crypto from "node:crypto";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

// GET /api/v1/webhooks — list all endpoints for tenant
export async function GET(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  const { data, error } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, url, description, events, is_active, created_at, last_triggered")
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endpoints: data ?? [] });
}

// POST /api/v1/webhooks — register new endpoint
export async function POST(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { url, description, events } = body as { url?: string; description?: string; events?: string[] };
  if (!url || !events?.length) return NextResponse.json({ error: "url and events are required" }, { status: 400 });

  // Validate URL — only allow http/https
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
    }
  } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  // Validate events
  const validEvents = events.filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (!validEvents.length) return NextResponse.json({ error: "No valid events" }, { status: 400 });

  // Generate signing secret
  const secret = "whsec_" + crypto.randomBytes(24).toString("hex");

  const { data, error } = await supabaseAdmin
    .from("webhook_endpoints")
    .insert({
      tenant_id: scope.tenantId,
      url,
      description: description ?? null,
      secret,
      events: validEvents,
    })
    .select("id, url, description, events, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endpoint: data, secret }, { status: 201 });
}
