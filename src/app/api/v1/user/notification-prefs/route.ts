import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";

export async function GET(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  if (scope.isDemo) {
    const { demoNotificationPrefs } = await import("@/lib/demo");
    return NextResponse.json({ prefs: demoNotificationPrefs });
  }

  const { data } = await supabaseAdmin
    .from("user_notification_prefs")
    .select("variance_alerts, reorder_alerts, weekly_digest, digest_day, alert_threshold")
    .eq("user_id", scope.userId)
    .maybeSingle();

  return NextResponse.json({ prefs: data ?? null });
}

export async function PUT(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { variance_alerts, reorder_alerts, weekly_digest, digest_day, alert_threshold } =
    body as {
      variance_alerts?: boolean;
      reorder_alerts?: boolean;
      weekly_digest?: boolean;
      digest_day?: string;
      alert_threshold?: string;
    };

  const { error } = await supabaseAdmin
    .from("user_notification_prefs")
    .upsert({
      user_id: scope.userId,
      tenant_id: scope.tenantId ?? null,
      ...(typeof variance_alerts === "boolean" ? { variance_alerts } : {}),
      ...(typeof reorder_alerts === "boolean" ? { reorder_alerts } : {}),
      ...(typeof weekly_digest === "boolean" ? { weekly_digest } : {}),
      ...(digest_day ? { digest_day } : {}),
      ...(alert_threshold ? { alert_threshold } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
