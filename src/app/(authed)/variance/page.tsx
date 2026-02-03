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
      <div className="rounded-3xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-soft)]">
        <h2 className="enterprise-heading text-2xl font-semibold">
          Variance & Shrink
        </h2>
        <p className="text-sm text-[var(--enterprise-muted)]">
          Weekly variance flags by inventory item.
        </p>
      </div>

      <div className="rounded-3xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-soft)]">
        {loading ? (
          <p className="text-sm text-[var(--enterprise-muted)]">
            Loading variance...
          </p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-[var(--enterprise-muted)]">
            No variance flags yet.
          </p>
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
      </div>
    </section>
  );
}
