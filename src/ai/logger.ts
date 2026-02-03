import { supabaseAdmin } from "@/lib/supabase/admin";

type AiAuditPayload = {
  tenantId?: string | null;
  locationId?: string | null;
  userId?: string | null;
  feature: string;
  promptVersion: string;
  inputHash: string;
  model: string;
  success: boolean;
  error?: string;
  durationMs?: number;
};

export const logAiRequest = async (payload: AiAuditPayload) => {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: payload.tenantId ?? null,
      location_id: payload.locationId ?? null,
      user_id: payload.userId ?? null,
      action: "ai_request",
      entity_type: payload.feature,
      entity_id: null,
      details: {
        prompt_version: payload.promptVersion,
        input_hash: payload.inputHash,
        model: payload.model,
        success: payload.success,
        error: payload.error ?? null,
        duration_ms: payload.durationMs ?? null,
      },
    });
  } catch (error) {
    console.error("ai audit log failed", error);
  }
};
