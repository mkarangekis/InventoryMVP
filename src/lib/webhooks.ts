/**
 * Webhook delivery engine
 * Fires registered endpoints for a given event type.
 * Logs all attempts in webhook_deliveries for observability.
 * Retries failed deliveries up to MAX_ATTEMPTS with exponential backoff.
 */
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const WEBHOOK_EVENTS = [
  "variance.flagged",
  "variance.resolved",
  "po.created",
  "po.approved",
  "po.sent",
  "snapshot.submitted",
  "ingest.completed",
  "alert.reorder",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

type WebhookEndpoint = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  tenant_id: string;
};

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 500; // 500ms, 1s, 2s

const signPayload = (secret: string, body: string): string =>
  "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

/** Fetch wrapper with manual timeout (compatible with all Node 16+) */
const fetchWithTimeout = (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const deliverWithRetry = async (
  ep: WebhookEndpoint,
  body: string,
  eventType: WebhookEvent,
  deliveryId: string | undefined,
): Promise<void> => {
  const sig = signPayload(ep.secret, body);
  const headers = {
    "Content-Type": "application/json",
    "X-Pourdex-Signature": sig,
    "X-Pourdex-Event": eventType,
    "User-Agent": "Pourdex-Webhooks/1.0",
  };

  let lastHttpStatus: number | null = null;
  let lastResponseBody: string | null = null;
  let success = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(ep.url, { method: "POST", headers, body }, 10_000);
      lastHttpStatus = res.status;
      lastResponseBody = await res.text().catch(() => null);
      success = res.ok;
      if (success) break;
    } catch (err) {
      lastResponseBody = err instanceof Error ? err.message : "Network error";
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt - 1));
    }
  }

  if (deliveryId) {
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: success ? "delivered" : "failed",
        http_status: lastHttpStatus,
        response_body: (lastResponseBody ?? "").slice(0, 500),
        attempt_count: MAX_ATTEMPTS,
        delivered_at: success ? new Date().toISOString() : null,
      })
      .eq("id", deliveryId);
  }

  if (success) {
    await supabaseAdmin
      .from("webhook_endpoints")
      .update({ last_triggered: new Date().toISOString() })
      .eq("id", ep.id);
  }
};

export async function fireWebhooks(
  tenantId: string,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const { data: endpoints } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, url, secret, events, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .contains("events", [eventType]);

  if (!endpoints || endpoints.length === 0) return;

  const body = JSON.stringify({
    event: eventType,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  // Fire all endpoints concurrently (each retries independently)
  await Promise.allSettled(
    (endpoints as WebhookEndpoint[]).map(async (ep) => {
      const { data: delivery } = await supabaseAdmin
        .from("webhook_deliveries")
        .insert({
          endpoint_id: ep.id,
          tenant_id: tenantId,
          event_type: eventType,
          payload: { event: eventType, data: payload },
          status: "pending",
          attempt_count: 0,
        })
        .select("id")
        .single();

      await deliverWithRetry(ep, body, eventType, delivery?.id);
    })
  );
}
