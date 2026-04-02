/**
 * QStash helpers — verify incoming messages and publish new tasks.
 *
 * All job handler routes call verifyQStashSignature() at the top
 * to ensure only QStash (or our own CRON_SECRET) can trigger them.
 */
import { Receiver } from "@upstash/qstash";

let _receiver: Receiver | null = null;

const getReceiver = (): Receiver => {
  if (_receiver) return _receiver;
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey     = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error("QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY not set");
  }
  _receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return _receiver;
};

export async function verifyQStashSignature(request: Request): Promise<boolean> {
  // Allow direct calls with CRON_SECRET (for Vercel cron → this route directly)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // If signing keys aren't configured, deny (don't allow unauthenticated access)
  const hasSigningKeys =
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!hasSigningKeys) {
    console.warn("QStash signing keys not set — rejecting unauthenticated job call");
    return false;
  }

  // Otherwise verify QStash signature
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;

  const body = await request.text();
  try {
    const receiver = getReceiver();
    const url = request.url;
    await receiver.verify({ signature, body, url });
    return true;
  } catch {
    return false;
  }
}

export async function publishJob(jobName: string, payload: Record<string, unknown> = {}) {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN is not set");

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const callbackUrl = `${baseUrl}/api/jobs/run`;

  const res = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(callbackUrl)}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Retries": "3",
      "Upstash-Delay": "0s",
    },
    body: JSON.stringify({ job: jobName, ...payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QStash publish failed: ${res.status} ${text}`);
  }

  return res.json();
}
