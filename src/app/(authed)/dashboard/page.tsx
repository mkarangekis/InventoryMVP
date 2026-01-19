"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

type ForecastRow = {
  forecast_date: string;
  inventory_item_id: string;
  forecast_usage_oz: number;
  location_id: string;
};


export default function DashboardPage() {
  const [flags, setFlags] = useState<VarianceFlag[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      const [varianceRes, forecastRes] = await Promise.all([
        fetch(`/api/variance${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/forecast${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (varianceRes.ok) {
        const payload = (await varianceRes.json()) as { flags: VarianceFlag[] };
        setFlags(payload.flags);
      }
      if (forecastRes.ok) {
        const payload = (await forecastRes.json()) as {
          forecast: ForecastRow[];
        };
        setForecast(payload.forecast);
      }

      setLoading(false);
    };

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


  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Leak & Variance Dashboard</h1>
      <p className="text-sm text-gray-600">
        Latest variance flags across your locations.
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

      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Next 14-day Forecast</h2>
        {forecast.length === 0 ? (
          <p className="text-sm text-gray-600">No forecast data yet.</p>
        ) : (
          <div className="mt-3 grid gap-2 text-sm text-gray-700">
            {forecast.slice(0, 10).map((row) => (
              <div key={`${row.inventory_item_id}-${row.forecast_date}`}>
                {new Date(row.forecast_date).toLocaleDateString()} -{" "}
                {row.forecast_usage_oz} oz
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
