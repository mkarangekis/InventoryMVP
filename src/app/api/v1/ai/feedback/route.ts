import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";

export async function POST(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { feature, inputHash, promptVersion, rating, comment } =
    body as { feature?: string; inputHash?: string; promptVersion?: string; rating?: number; comment?: string };

  if (!feature || !inputHash || !promptVersion || (rating !== 1 && rating !== -1)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("ai_insight_feedback").insert({
    tenant_id: scope.tenantId,
    location_id: scope.locationId ?? null,
    user_id: scope.userId ?? null,
    feature,
    prompt_version: promptVersion,
    input_hash: inputHash,
    rating,
    comment: comment ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
