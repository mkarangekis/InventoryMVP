"use client";

import { isEnterpriseUIEnabled } from "@/config/flags";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

export default function SettingsPage() {
  const enterpriseEnabled = isEnterpriseUIEnabled();

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-600">
          Workspace settings are managed in Supabase for now.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[var(--enterprise-border)] bg-white p-6 shadow-sm">
        <h2 className="enterprise-heading text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-[var(--enterprise-muted)]">
          {PRODUCT_NAME} workspace preferences and access control.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--enterprise-border)] bg-white p-6 shadow-sm">
          <h3 className="enterprise-heading text-lg font-semibold">
            Workspace
          </h3>
          <p className="text-sm text-[var(--enterprise-muted)]">
            Update workspace details in your {COMPANY_NAME} admin console.
          </p>
          <div className="mt-4 rounded-2xl border border-[var(--enterprise-border)] bg-slate-50 p-4 text-sm">
            <p className="text-xs uppercase text-[var(--enterprise-muted)]">
              Current status
            </p>
            <p className="mt-2 font-semibold">Managed via Supabase</p>
            <p className="text-xs text-[var(--enterprise-muted)]">
              RLS policies and team access live in the Supabase project.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--enterprise-border)] bg-white p-6 shadow-sm">
          <h3 className="enterprise-heading text-lg font-semibold">
            Notifications
          </h3>
          <p className="text-sm text-[var(--enterprise-muted)]">
            Configure alerting by connecting your notification provider.
          </p>
          <div className="mt-4 rounded-2xl border border-[var(--enterprise-border)] bg-slate-50 p-4 text-sm">
            <p className="text-xs uppercase text-[var(--enterprise-muted)]">
              Status
            </p>
            <p className="mt-2 font-semibold">Not configured</p>
            <p className="text-xs text-[var(--enterprise-muted)]">
              Add integrations after the MVP rollout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
