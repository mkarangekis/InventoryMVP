"use client";

import { useEffect, useState } from "react";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";

type BillingStatus = {
  qb_customer_id: string | null;
  qb_invoice_id: string | null;
  qb_realm_id: string | null;
  qb_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export default function SettingsPage() {
  const enterpriseEnabled = isEnterpriseUIEnabled();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  const loadBilling = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setBillingLoading(false);
      return;
    }
    const res = await fetch("/api/billing/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setBillingError(await res.text());
      setBillingLoading(false);
      return;
    }
    setBilling((await res.json()) as BillingStatus);
    setBillingLoading(false);
  };

  const handleCheckout = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setBillingError(await res.text());
      return;
    }
    const payload = (await res.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
    }
  };

  const handlePortal = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setBillingError(await res.text());
      return;
    }
    const payload = (await res.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
    }
  };

  useEffect(() => {
    void loadBilling();
  }, []);

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-600">
          Workspace settings are managed in Supabase for now.
        </p>

        <AIInsightsTopPanel
          pageContext="settings"
          loading={false}
          summary="Review billing status and access control settings."
          recommendations={[
            {
              action: "Manage billing in Settings",
              reason: "Update subscription, invoices, and payment methods.",
              urgency: "med",
            },
          ]}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Settings
            </h2>
            <p className="app-card-subtitle">
              {PRODUCT_NAME} workspace preferences and access control.
            </p>
          </div>
        </div>
      </div>

      <AIInsightsTopPanel
        pageContext="settings"
        loading={billingLoading}
        error={billingError}
        summary={
          billing?.qb_status
            ? `Billing status: ${billing.stripe_status}`
            : "Billing status not started yet."
        }
        recommendations={[
          {
            action:
              billing?.qb_status === "past_due"
                ? "Update payment method"
                : "Manage subscription",
            reason: "Open the billing portal to update your plan and payment method.",
            urgency: billing?.qb_status === "past_due" ? "high" : "med",
          },
        ]}
        risks={
          billing?.qb_status === "past_due"
            ? [
                {
                  risk: "Past-due subscription",
                  impact: "Access may be limited until payment is updated.",
                },
              ]
            : []
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Workspace</h3>
              <p className="app-card-subtitle">
                Update workspace details in your {COMPANY_NAME} admin console.
              </p>
            </div>
          </div>
          <div className="app-card-body">
            <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4 text-sm">
              <p className="text-xs uppercase text-[var(--enterprise-muted)]">
                Current status
              </p>
              <p className="mt-2 font-semibold">Managed via Supabase</p>
              <p className="text-xs text-[var(--enterprise-muted)]">
                RLS policies and team access live in the Supabase project.
              </p>
            </div>
          </div>
        </div>

        <NotificationsSettings />
      </div>

      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3 className="app-card-title">Billing</h3>
            <p className="app-card-subtitle">
              Manage your subscription and payment method.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          {/* White-label info */}
          <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4 text-sm mb-4">
            <p className="text-xs uppercase text-[var(--enterprise-muted)] mb-2">White-label / Franchise Mode</p>
            <p className="font-semibold text-[var(--enterprise-fg)]">Available on Enterprise</p>
            <p className="text-xs text-[var(--enterprise-muted)] mt-1">
              Custom branding, subdomain routing, and multi-location franchise dashboards are available via the Enterprise plan.
              Contact <span style={{ color: "var(--enterprise-accent)" }}>sales@pourdex.com</span> to enable.
            </p>
          </div>

          {billingLoading ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              Loading billing status...
            </p>
          ) : billingError ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              {billingError}
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4">
                <p className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Subscription
                </p>
                <p className="mt-2 font-semibold">
                  {billing?.qb_status ?? "Not started"}
                </p>
                {billing?.trial_ends_at ? (
                  <p className="text-xs text-[var(--enterprise-muted)]">
                    Trial ends: {new Date(billing.trial_ends_at).toLocaleDateString()}
                  </p>
                ) : null}
                {billing?.current_period_end ? (
                  <p className="text-xs text-[var(--enterprise-muted)]">
                    Current period ends:{" "}
                    {new Date(billing.current_period_end).toLocaleDateString()}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" onClick={handleCheckout}>
                  Start free trial
                </button>
                <button className="btn-secondary btn-sm" onClick={handlePortal}>
                  Manage subscription
                </button>
              </div>
              <p className="text-xs text-[var(--enterprise-muted)]">
                Cancel anytime from the billing portal.
              </p>
            </div>
          )}
        </div>
      </div>

      <WebhookSettings />
    </section>
  );
}
