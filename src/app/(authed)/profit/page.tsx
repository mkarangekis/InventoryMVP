"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ProfitRow = {
  menu_item_id: string;
  name: string;
  qty_sold: number;
  revenue: number;
  price_each: number;
  cost_per_serv: number;
  profit_per_serv: number;
  margin_pct: number;
  recommendations: string[];
};

type MenuItem = {
  id: string;
  name: string;
  location_id: string;
};

type Ingredient = {
  id: string;
  name: string;
  type: string;
};

type Location = {
  id: string;
  name: string;
};

export default function ProfitPage() {
  const [items, setItems] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [glassType, setGlassType] = useState("rocks");
  const [iceType, setIceType] = useState("standard");
  const [targetPourOz, setTargetPourOz] = useState("2.5");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<
    { ingredientId: string; ounces: string }[]
  >([{ ingredientId: "", ounces: "" }]);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const loadProfit = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("Not signed in");
      setLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const [profitRes, menuRes, ingredientRes, locationsRes] =
      await Promise.all([
        fetch(`/api/profit/ranking${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/menu-items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/ingredients", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/locations", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

    if (profitRes.ok) {
      const payload = (await profitRes.json()) as { items: ProfitRow[] };
      setItems(payload.items);
      setErrorMessage(null);
    } else {
      setErrorMessage(
        "Unable to load profit data. Please check your connection and try again.",
      );
    }
    if (menuRes.ok) {
      const payload = (await menuRes.json()) as { items: MenuItem[] };
      setMenuItems(payload.items);
    }
    if (ingredientRes.ok) {
      const payload = (await ingredientRes.json()) as { items: Ingredient[] };
      setIngredients(payload.items);
    }
    if (locationsRes.ok) {
      const payload = (await locationsRes.json()) as { locations: Location[] };
      setLocations(payload.locations);
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("barops.locationId")
          : null;
      setSelectedLocation(
        stored && payload.locations.some((loc) => loc.id === stored)
          ? stored
          : payload.locations[0]?.id ?? "",
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadProfit();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setLoading(true);
      void loadProfit();
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

  const handleAddLine = () => {
    setLines((prev) => [...prev, { ingredientId: "", ounces: "" }]);
  };

  const handleLineChange = (
    index: number,
    field: "ingredientId" | "ounces",
    value: string,
  ) => {
    setLines((prev) =>
      prev.map((line, idx) =>
        idx === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const handleSubmitSpec = async () => {
    setStatus(null);
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("Not signed in");
      return;
    }

    const response = await fetch("/api/specs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locationId: selectedLocation,
        menuItemId: selectedMenuItem,
        glassType,
        iceType,
        targetPourOz,
        notes,
        lines: lines.filter((line) => line.ingredientId && line.ounces),
      }),
    });

    if (!response.ok) {
      setStatus(
        "Unable to save spec right now. Please check your connection and try again.",
      );
      return;
    }

    setStatus("Spec saved");
  };

  const totalRevenue = items.reduce(
    (sum, row) => sum + (row.revenue || 0),
    0,
  );
  const totalCost = items.reduce(
    (sum, row) => sum + (row.cost_per_serv || 0) * (row.qty_sold || 0),
    0,
  );
  const totalProfit = items.reduce(
    (sum, row) => sum + (row.profit_per_serv || 0) * (row.qty_sold || 0),
    0,
  );
  const marginPct = totalRevenue
    ? ((totalProfit / totalRevenue) * 100).toFixed(1)
    : "—";

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Profit Intelligence
            </h2>
            <p className="app-card-subtitle">
              Ranked by profit per serving with margin and recommendations.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          <div className="app-kpi-grid">
            <div className="app-kpi-card">
              <p className="app-kpi-label">Revenue</p>
              <p className="app-kpi-value">
                {loading ? "—" : formatCurrency(totalRevenue)}
              </p>
              <p className="app-kpi-meta">This period</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Pour Cost</p>
              <p className="app-kpi-value">
                {loading ? "—" : formatCurrency(totalCost)}
              </p>
              <p className="app-kpi-meta">Based on specs</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Profit</p>
              <p className="app-kpi-value">
                {loading ? "—" : formatCurrency(totalProfit)}
              </p>
              <p className="app-kpi-meta">Gross margin</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Margin</p>
              <p className="app-kpi-value">{loading ? "—" : `${marginPct}%`}</p>
              <p className="app-kpi-meta">Avg across menu</p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3 className="app-card-title">Menu Profit Ranking</h3>
            <p className="app-card-subtitle">
              Prioritize high-margin items and review low performers.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          {errorMessage ? (
            <div className="app-empty">
              <div className="app-empty-title">Unable to load profit data</div>
              <p className="app-empty-desc">
                Please check your connection and try again, or contact support
                if the issue persists.
              </p>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              Loading profit ranking...
            </p>
          ) : items.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-title">No Sales Data Yet</div>
              <p className="app-empty-desc">
                Once sales data is ingested, margin intelligence appears here.
              </p>
              <div className="app-empty-actions">
                <Link className="btn-primary btn-sm" href="/ingest">
                  Connect POS
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface)]">
              <table className="app-table w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
                  <tr>
                    <th className="px-3 py-2">Drink</th>
                    <th className="px-3 py-2">Sold</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Cost</th>
                    <th className="px-3 py-2">Profit</th>
                    <th className="px-3 py-2">Margin</th>
                    <th className="px-3 py-2">Rec</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.menu_item_id} className="border-t">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.qty_sold}</td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.price_each)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.cost_per_serv)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.profit_per_serv)}
                      </td>
                      <td className="px-3 py-2">{row.margin_pct}%</td>
                      <td className="px-3 py-2">
                        {row.recommendations.join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3 className="app-card-title">Create Drink Spec</h3>
            <p className="app-card-subtitle">
              Add a new versioned spec for a menu item.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-gray-700">
              Location
              <select
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Menu item
              <select
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={selectedMenuItem}
                onChange={(event) => setSelectedMenuItem(event.target.value)}
              >
                <option value="">Select menu item</option>
                {menuItems
                  .filter((item) =>
                    selectedLocation
                      ? item.location_id === selectedLocation
                      : true,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Glass type
              <input
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={glassType}
                onChange={(event) => setGlassType(event.target.value)}
              />
            </label>
            <label className="text-sm text-gray-700">
              Ice type
              <input
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={iceType}
                onChange={(event) => setIceType(event.target.value)}
              />
            </label>
            <label className="text-sm text-gray-700">
              Target pour (oz)
              <input
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={targetPourOz}
                onChange={(event) => setTargetPourOz(event.target.value)}
              />
            </label>
            <label className="text-sm text-gray-700">
              Notes
              <input
                className="mt-1 w-full rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {lines.map((line, index) => (
              <div key={`line-${index}`} className="flex gap-2">
                <select
                  className="w-2/3 rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                  value={line.ingredientId}
                  onChange={(event) =>
                    handleLineChange(index, "ingredientId", event.target.value)
                  }
                >
                  <option value="">Select ingredient</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-1/3 rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                  placeholder="oz"
                  value={line.ounces}
                  onChange={(event) =>
                    handleLineChange(index, "ounces", event.target.value)
                  }
                />
              </div>
            ))}
            <button className="btn-ghost btn-sm" onClick={handleAddLine}>
              Add ingredient line
            </button>
          </div>

          <button className="btn-primary btn-sm mt-4" onClick={handleSubmitSpec}>
            Save spec
          </button>

          {status ? (
            <p className="mt-2 text-sm text-[var(--enterprise-muted)]">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
