"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";

type VarianceFlag = {
  id: string;
  week_start_date: string;
  item_name: string;
  expected_remaining_oz: string;
  actual_remaining_oz: string;
  variance_oz: string;
  variance_pct: string;
  severity: string;
};

export default function VariancePage() {
  const [flags, setFlags] = useState<VarianceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const enterpriseEnabled = isEnterpriseUIEnabled();

  const load = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/variance${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const payload = (await response.json()) as { flags: VarianceFlag[] };
      setFlags(payload.flags);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();

    const handleLocationChange = () => {
      void load();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("location-change", handleLocationChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("location-change", handleLocationChange);
      }
    };
  }, []);

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Variance & Shrink</h1>
        <p className="text-sm text-gray-600">
          Weekly variance flags by inventory item.
        </p>
        {loading ? (
          <p className="text-sm text-gray-600">Loading variance...</p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-gray-600">No variance flags yet.</p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Week</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Variance</th>
                  <th className="px-3 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.id} className="border-t">
                    <td className="px-3 py-2">{flag.item_name}</td>
                    <td className="px-3 py-2">
                      {new Date(flag.week_start_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">{flag.expected_remaining_oz}</td>
                    <td className="px-3 py-2">{flag.actual_remaining_oz}</td>
                    <td className="px-3 py-2">{flag.variance_oz}</td>
                    <td className="px-3 py-2 font-semibold">{flag.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Variance & Shrink
            </h2>
            <p className="app-card-subtitle">
              Weekly variance flags by inventory item.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          {loading ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              Loading variance...
            </p>
          ) : flags.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-title">No Variance Flags Yet</div>
              <p className="app-empty-desc">
                Connect your POS and complete inventory counts to surface
                variance signals.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--enterprise-border)]">
              <table className="app-table w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2">Expected</th>
                    <th className="px-3 py-2">Actual</th>
                    <th className="px-3 py-2">Variance</th>
                    <th className="px-3 py-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag) => (
                    <tr key={flag.id} className="border-t">
                      <td className="px-3 py-2">{flag.item_name}</td>
                      <td className="px-3 py-2">
                        {new Date(flag.week_start_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {flag.expected_remaining_oz}
                      </td>
                      <td className="px-3 py-2">{flag.actual_remaining_oz}</td>
                      <td className="px-3 py-2">{flag.variance_oz}</td>
                      <td className="px-3 py-2 font-semibold">
                        {flag.severity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
