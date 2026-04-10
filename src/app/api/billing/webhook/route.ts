import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyQuickBooksSignature, qbEventToStatus } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

type QbEntity = {
  name: string;
  id: string;
  operation: string;
  lastUpdated: string;
};

type QbEventNotification = {
  realmId: string;
  dataChangeEvent: {
    entities: QbEntity[];
  };
};

type QbWebhookPayload = {
  eventNotifications: QbEventNotification[];
};

export async function POST(request: Request) {
  const headersList = await headers();
  const signature = headersList.get("intuit-signature");
  const verifierToken = process.env.QB_WEBHOOK_VERIFIER_TOKEN;

  if (!verifierToken) {
    return new Response("QB_WEBHOOK_VERIFIER_TOKEN is not set", { status: 500 });
  }

  if (!signature) {
    return new Response("Missing intuit-signature header", { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyQuickBooksSignature(rawBody, signature, verifierToken)) {
    console.error("QuickBooks webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let payload: QbWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as QbWebhookPayload;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const updateUserBilling = async (
    userId: string,
    billing: Record<string, unknown>,
  ) => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...metadata,
        billing: {
          ...(metadata.billing as Record<string, unknown> ?? {}),
          ...billing,
        },
      },
    });
  };

  // Find a user by their stored qb_realm_id
  const findUserByRealmId = async (realmId: string) => {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return data.users.find((u) => {
      const billing = (u.user_metadata?.billing ?? {}) as Record<string, unknown>;
      return billing.qb_realm_id === realmId;
    }) ?? null;
  };

  for (const notification of payload.eventNotifications ?? []) {
    const { realmId, dataChangeEvent } = notification;

    const user = await findUserByRealmId(realmId);
    if (!user) {
      // No user linked to this realm yet — store realm for later linking
      console.warn(`QB webhook: no user found for realmId ${realmId}`);
      continue;
    }

    for (const entity of dataChangeEvent?.entities ?? []) {
      const status = qbEventToStatus(entity.name, entity.operation);
      if (!status) continue;

      const billingUpdate: Record<string, unknown> = {
        qb_status: status,
        qb_realm_id: realmId,
        qb_last_event_entity: entity.name,
        qb_last_event_operation: entity.operation,
        qb_last_event_at: entity.lastUpdated,
      };

      // Track invoice ID as the subscription reference
      if (entity.name.toLowerCase() === "invoice") {
        billingUpdate.qb_invoice_id = entity.id;
      }

      await updateUserBilling(user.id, billingUpdate);

      console.log(
        `QB webhook: updated user ${user.id} status → ${status} ` +
          `(${entity.name} ${entity.operation}, realm ${realmId})`,
      );
    }
  }

  // QuickBooks expects a 200 with no body to acknowledge receipt
  return new Response(null, { status: 200 });
}
