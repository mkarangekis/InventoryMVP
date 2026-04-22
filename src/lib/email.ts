/**
 * Email notification service (Phase 5)
 * Uses Resend.com to send transactional emails.
 *
 * Three notification types:
 *  - High variance alert (immediate, per-item)
 *  - Reorder trigger alert (immediate, per-PO)
 *  - Weekly digest (nightly job, Sunday)
 */
import { Resend } from "resend";

const FROM = "Pourdex <notifications@pourdex.app>";
const REPLY_TO = "pourdex@augmentationcg.com";

let _client: Resend | null = null;
const getClient = (): Resend => {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _client = new Resend(key);
  return _client;
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type VarianceAlertPayload = {
  to: string;
  locationName: string;
  items: { item: string; variance_pct: number; z_score: number | null; severity: string; trend: string }[];
  totalShrinkageUsd: number | null;
  weekStartDate: string;
};

export type ReorderAlertPayload = {
  to: string;
  locationName: string;
  poCount: number;
  totalValue: number;
  items: { name: string; qty: number; vendor: string; cost: number }[];
};

export type WeeklyDigestPayload = {
  to: string;
  locationName: string;
  weekRange: string;
  revenue: number;
  revenueDelta: number | null;
  varianceFlags: number;
  highFlags: number;
  shrinkageUsd: number | null;
  topWin: string;
  topWatchout: string;
  nextAction: string;
};

// ── Formatters ────────────────────────────────────────────────────────────────

function severityBadge(severity: string): string {
  const colors: Record<string, string> = {
    high: "#dc2626",
    medium: "#d97706",
    low: "#2563eb",
    none: "#6b7280",
  };
  const color = colors[severity] ?? "#6b7280";
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">${severity}</span>`;
}

function baseLayout(content: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0B09;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1814;border-radius:12px;overflow:hidden;border:1px solid #2a2520">
        <tr>
          <td style="background:#1a1814;padding:24px 32px;border-bottom:1px solid #2a2520">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="background:#C8943E;color:#0C0B09;font-size:16px;font-weight:800;padding:6px 12px;border-radius:6px;letter-spacing:0.05em">P</span>
                  <span style="color:#d4a853;font-size:18px;font-weight:700;margin-left:12px;vertical-align:middle">Pourdex</span>
                </td>
                <td align="right" style="color:#6b6560;font-size:12px">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2a2520;text-align:center">
            <p style="color:#4a4540;font-size:11px;margin:0">Pourdex Bar Ops · <a href="mailto:${REPLY_TO}" style="color:#6b6560;text-decoration:none">${REPLY_TO}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Variance Alert ─────────────────────────────────────────────────────────────

export async function sendVarianceAlert(payload: VarianceAlertPayload): Promise<void> {
  const client = getClient();
  const highCount = payload.items.filter((i) => i.severity === "high").length;

  const itemRows = payload.items
    .slice(0, 10)
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#e8e0d0;font-size:14px">${item.item}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#e8e0d0;text-align:center;font-size:14px">${(item.variance_pct * 100).toFixed(1)}%</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;text-align:center">${item.z_score !== null ? `<span style="color:#d4a853;font-size:13px">Z ${item.z_score.toFixed(1)}</span>` : "—"}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;text-align:center">${severityBadge(item.severity)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#9c8070;font-size:12px;text-align:right">${item.trend}</td>
    </tr>`,
    )
    .join("");

  const content = `
    <h1 style="color:#e8e0d0;font-size:22px;font-weight:700;margin:0 0 4px">${highCount > 0 ? "⚠️ " : ""}Variance Alert — ${payload.locationName}</h1>
    <p style="color:#9c8070;font-size:14px;margin:0 0 24px">Week of ${payload.weekStartDate} · ${payload.items.length} item${payload.items.length !== 1 ? "s" : ""} flagged${payload.totalShrinkageUsd !== null ? ` · Est. $${payload.totalShrinkageUsd.toFixed(0)} shrinkage` : ""}</p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:left;padding-bottom:8px;border-bottom:1px solid #2a2520">ITEM</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:center;padding-bottom:8px;border-bottom:1px solid #2a2520">VARIANCE</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:center;padding-bottom:8px;border-bottom:1px solid #2a2520">Z-SCORE</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:center;padding-bottom:8px;border-bottom:1px solid #2a2520">SEVERITY</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:right;padding-bottom:8px;border-bottom:1px solid #2a2520">TREND</th>
      </tr>
      ${itemRows}
    </table>

    <p style="margin:24px 0 0;color:#6b6560;font-size:12px">
      These flags are calculated from per-ingredient learned baselines (Z-score). Items exceeding 2σ above their rolling 8-week average are flagged as medium or high severity.
    </p>
  `;

  await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: payload.to,
    subject: `${highCount > 0 ? `[${highCount} HIGH] ` : ""}Variance Alert — ${payload.locationName}`,
    html: baseLayout(content, "Variance Alert"),
  });
}

// ── Reorder Alert ──────────────────────────────────────────────────────────────

export async function sendReorderAlert(payload: ReorderAlertPayload): Promise<void> {
  const client = getClient();

  const itemRows = payload.items
    .slice(0, 10)
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #2a2520;color:#e8e0d0;font-size:13px">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2520;color:#e8e0d0;text-align:center;font-size:13px">${item.qty} units</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2520;color:#9c8070;font-size:13px;text-align:right">${item.vendor}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2520;color:#d4a853;font-size:13px;text-align:right">$${item.cost.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const content = `
    <h1 style="color:#e8e0d0;font-size:22px;font-weight:700;margin:0 0 4px">Reorder Required — ${payload.locationName}</h1>
    <p style="color:#9c8070;font-size:14px;margin:0 0 24px">${payload.poCount} purchase order${payload.poCount !== 1 ? "s" : ""} ready for review · Total value: <strong style="color:#d4a853">$${payload.totalValue.toFixed(2)}</strong></p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="color:#6b6560;font-size:11px;text-align:left;padding-bottom:8px;border-bottom:1px solid #2a2520">ITEM</th>
        <th style="color:#6b6560;font-size:11px;text-align:center;padding-bottom:8px;border-bottom:1px solid #2a2520">QTY</th>
        <th style="color:#6b6560;font-size:11px;text-align:right;padding-bottom:8px;border-bottom:1px solid #2a2520">VENDOR</th>
        <th style="color:#6b6560;font-size:11px;text-align:right;padding-bottom:8px;border-bottom:1px solid #2a2520">COST</th>
      </tr>
      ${itemRows}
    </table>

    <div style="margin-top:24px;padding:16px;background:#0f1a0f;border:1px solid #1a3a1a;border-radius:8px">
      <p style="color:#4ade80;font-size:13px;margin:0">These purchase orders were generated automatically based on your reorder policies and current inventory levels. Review and approve in Pourdex before sending to vendors.</p>
    </div>
  `;

  await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: payload.to,
    subject: `Reorder Required — ${payload.locationName} ($${payload.totalValue.toFixed(0)})`,
    html: baseLayout(content, "Reorder Alert"),
  });
}

// ── Import Failure Alert ───────────────────────────────────────────────────────

export type ImportFailureAlertPayload = {
  to: string;
  locationName: string;
  failures: { posType: string; lastAttempt: string | null; error: string | null }[];
  date: string;
};

export async function sendImportFailureAlert(payload: ImportFailureAlertPayload): Promise<void> {
  const client = getClient();

  const rows = payload.failures
    .map(
      (f) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#e8e0d0;font-size:14px;font-weight:600">${f.posType.charAt(0).toUpperCase() + f.posType.slice(1)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#9c8070;font-size:13px">${f.lastAttempt ? new Date(f.lastAttempt).toLocaleString() : "Never"}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2520;color:#f87171;font-size:12px;max-width:240px;word-break:break-word">${f.error ?? "No import run found for last night"}</td>
    </tr>`,
    )
    .join("");

  const content = `
    <h1 style="color:#e8e0d0;font-size:22px;font-weight:700;margin:0 0 4px">⚠️ Nightly Import Failed — ${payload.locationName}</h1>
    <p style="color:#9c8070;font-size:14px;margin:0 0 24px">
      ${payload.failures.length} POS connection${payload.failures.length !== 1 ? "s" : ""} did not complete a successful import last night (${payload.date}).
      Sales data may be out of date until the next successful import.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:left;padding-bottom:8px;border-bottom:1px solid #2a2520">POS SYSTEM</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:left;padding-bottom:8px;border-bottom:1px solid #2a2520">LAST ATTEMPT</th>
        <th style="color:#6b6560;font-size:11px;font-weight:600;text-align:left;padding-bottom:8px;border-bottom:1px solid #2a2520">ERROR</th>
      </tr>
      ${rows}
    </table>

    <div style="padding:16px;background:#1a0f0f;border:1px solid #3a1a1a;border-radius:8px">
      <p style="color:#f87171;font-size:13px;margin:0 0 8px;font-weight:600">What to check</p>
      <ul style="color:#e0c8c8;font-size:13px;margin:0;padding-left:20px;line-height:1.8">
        <li>Toast: check SFTP server logs at /var/pourdex/logs/errors.log on the VPS</li>
        <li>SkyTab: verify the email subscription is still active in Lighthouse</li>
        <li>Square: confirm the OAuth token hasn't expired in POS Integrations settings</li>
        <li>Replay: backup files are saved at /var/pourdex/backups/{date}/{username}/</li>
      </ul>
    </div>
  `;

  await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: payload.to,
    subject: `⚠️ Import Failed — ${payload.locationName} (${payload.date})`,
    html: baseLayout(content, "Import Failure Alert"),
  });
}

// ── Weekly Digest ──────────────────────────────────────────────────────────────

export async function sendWeeklyDigest(payload: WeeklyDigestPayload): Promise<void> {
  const client = getClient();
  const revenueArrow = payload.revenueDelta !== null ? (payload.revenueDelta >= 0 ? "↑" : "↓") : "";
  const revenueColor = payload.revenueDelta !== null ? (payload.revenueDelta >= 0 ? "#4ade80" : "#f87171") : "#e8e0d0";

  const content = `
    <h1 style="color:#e8e0d0;font-size:22px;font-weight:700;margin:0 0 4px">Weekly Brief — ${payload.locationName}</h1>
    <p style="color:#9c8070;font-size:14px;margin:0 0 28px">${payload.weekRange}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr>
        <td width="33%" style="text-align:center;padding:16px;background:#0f0e0c;border-radius:8px;margin:0 8px">
          <div style="font-size:24px;font-weight:700;color:#d4a853">$${payload.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
          <div style="font-size:11px;color:#6b6560;margin-top:4px">REVENUE</div>
          ${payload.revenueDelta !== null ? `<div style="font-size:12px;color:${revenueColor};margin-top:2px">${revenueArrow} ${Math.abs(payload.revenueDelta).toFixed(1)}% vs last week</div>` : ""}
        </td>
        <td width="8px"></td>
        <td width="33%" style="text-align:center;padding:16px;background:#0f0e0c;border-radius:8px">
          <div style="font-size:24px;font-weight:700;color:${payload.highFlags > 0 ? "#f87171" : "#e8e0d0"}">${payload.varianceFlags}</div>
          <div style="font-size:11px;color:#6b6560;margin-top:4px">VARIANCE FLAGS</div>
          ${payload.highFlags > 0 ? `<div style="font-size:12px;color:#f87171;margin-top:2px">${payload.highFlags} high-severity</div>` : ""}
        </td>
        <td width="8px"></td>
        <td width="33%" style="text-align:center;padding:16px;background:#0f0e0c;border-radius:8px">
          <div style="font-size:24px;font-weight:700;color:${(payload.shrinkageUsd ?? 0) > 100 ? "#f87171" : "#e8e0d0"}">$${(payload.shrinkageUsd ?? 0).toFixed(0)}</div>
          <div style="font-size:11px;color:#6b6560;margin-top:4px">EST. SHRINKAGE</div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:16px;padding:16px;background:#0f1a0f;border:1px solid #1a3a1a;border-radius:8px">
      <div style="color:#4ade80;font-size:11px;font-weight:600;margin-bottom:6px">WIN THIS WEEK</div>
      <div style="color:#c8e0c8;font-size:14px">${payload.topWin}</div>
    </div>

    <div style="margin-bottom:16px;padding:16px;background:#1a0f0f;border:1px solid #3a1a1a;border-radius:8px">
      <div style="color:#f87171;font-size:11px;font-weight:600;margin-bottom:6px">WATCHOUT</div>
      <div style="color:#e0c8c8;font-size:14px">${payload.topWatchout}</div>
    </div>

    <div style="padding:16px;background:#0f0f1a;border:1px solid #1a1a3a;border-radius:8px">
      <div style="color:#818cf8;font-size:11px;font-weight:600;margin-bottom:6px">TOP NEXT ACTION</div>
      <div style="color:#c8c8e0;font-size:14px">${payload.nextAction}</div>
    </div>
  `;

  await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: payload.to,
    subject: `Weekly Brief — ${payload.locationName} | $${payload.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} revenue${payload.highFlags > 0 ? ` · ${payload.highFlags} high-severity flags` : ""}`,
    html: baseLayout(content, "Weekly Brief"),
  });
}
