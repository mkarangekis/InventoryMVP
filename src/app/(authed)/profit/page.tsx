"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AiCard } from "@/components/ai/AiCard";
import { BarChart } from "@/components/charts/BarChart";
import { AiMenuSuggestions } from "@/ai/types";

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
  const [aiSuggestions, setAiSuggestions] = useState<AiMenuSuggestions | null>(
    null,
  );
  const [aiLoading, setAiLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
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

  const loadAi = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setAiLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/v1/ai/menu-suggestions${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      setAiEnabled(false);
      setAiLoading(false);
      return;
    }

    if (response.ok) {
      setAiSuggestions((await response.json()) as AiMenuSuggestions);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    void loadProfit();
    void loadAi();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setLoading(true);
      void loadProfit();
      void loadAi();
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

  const marginPctNum = parseFloat(marginPct as string);

  return (
    <section className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 6 }}>Menu Analytics</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Profit Intelligence</h1>
        <p style={{ fontSize: 13, color: "#8b949e", marginTop: 6 }}>Menu item ranking by margin. Optimize pricing and identify high-value pours.</p>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Revenue", value: loading ? "—" : formatCurrency(totalRevenue), meta: "This period", color: "#22c55e" },
          { label: "Ingredient Cost", value: loading ? "—" : formatCurrency(totalCost), meta: "What you paid to make it", color: "#8b949e" },
          { label: "Profit", value: loading ? "—" : formatCurrency(totalProfit), meta: "After ingredient cost", color: "#22c55e" },
          { label: "Profit Margin", value: loading ? "—" : `${marginPct}%`, meta: marginPctNum >= 65 ? "On target" : marginPctNum >= 50 ? "Could be better" : "Needs attention", color: loading ? "#8b949e" : marginPctNum >= 65 ? "#22c55e" : marginPctNum >= 50 ? "#d4a853" : "#ef4444" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: kpi.color, marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>{kpi.meta}</p>
          </div>
        ))}
      </div>

      {/* ── AI Suggestions ── */}
      {aiEnabled ? (
        <AiCard
          title="Ways to Make More Money"
          subtitle="Pricing and recipe adjustments that could increase your take-home profit."
          loading={aiLoading}
          error={!aiSuggestions ? "Suggestions not available yet." : null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {aiSuggestions?.suggestions.map((suggestion) => (
              <div
                key={`${suggestion.drink}-${suggestion.suggested_price}`}
                style={{ background: "#1a2230", border: "1px solid #2a3240", borderRadius: 8, padding: "12px 14px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f6fc" }}>{suggestion.drink}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}>
                    +{formatCurrency(suggestion.margin_impact_monthly)}/mo
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>
                  Current price {formatCurrency(suggestion.current_price)} → Suggested {formatCurrency(suggestion.suggested_price)}
                </p>
                <p style={{ fontSize: 12, color: "#c9d1d9", lineHeight: 1.5 }}>{suggestion.rationale}</p>
                {suggestion.risk && (
                  <p style={{ fontSize: 11, color: "#d4a853", marginTop: 4 }}>Heads up: {suggestion.risk}</p>
                )}
              </div>
            ))}
          </div>
        </AiCard>
      ) : null}

      {/* ── Two-column: Table + Visual Ranking ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* Full table */}
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732" }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Menu Profit Ranking</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Sorted by profit per serving</p>
          </div>
          {errorMessage ? (
            <p style={{ padding: "20px 24px", color: "#ef4444", fontSize: 13 }}>Unable to load profit data. Check your connection.</p>
          ) : loading ? (
            <p style={{ padding: "20px 24px", color: "#8b949e", fontSize: 13 }}>Loading profit ranking...</p>
          ) : items.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#f0f6fc", marginBottom: 6 }}>No Sales Data Yet</p>
              <p style={{ fontSize: 12, color: "#8b949e", marginBottom: 12 }}>Once sales data is ingested, margin intelligence appears here.</p>
              <Link className="btn-primary btn-sm" href="/ingest">Connect POS</Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2732" }}>
                    {["#", "Drink", "Sold", "Price", "Cost", "Profit", "Margin"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const marginColor = row.margin_pct >= 70 ? "#22c55e" : row.margin_pct >= 60 ? "#d4a853" : "#ef4444";
                    return (
                      <tr key={row.menu_item_id} style={{ borderBottom: i < items.length - 1 ? "1px solid #1a2230" : "none" }}>
                        <td style={{ padding: "9px 14px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                        <td style={{ padding: "9px 14px", fontWeight: 600, color: "#f0f6fc" }}>{row.name}</td>
                        <td style={{ padding: "9px 14px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{row.qty_sold}</td>
                        <td style={{ padding: "9px 14px", color: "#c9d1d9", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(row.price_each)}</td>
                        <td style={{ padding: "9px 14px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(row.cost_per_serv)}</td>
                        <td style={{ padding: "9px 14px", color: "#22c55e", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(row.profit_per_serv)}</td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ color: marginColor, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{row.margin_pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visual margin bar breakdown */}
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc", marginBottom: 4 }}>Margin by Item</p>
          <p style={{ fontSize: 11, color: "#8b949e", marginBottom: 16 }}>Visual margin breakdown</p>
          {loading ? (
            <p style={{ fontSize: 13, color: "#8b949e" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8b949e" }}>No data yet.</p>
          ) : (
            <BarChart
              variant="horizontal"
              data={[...items]
                .sort((a, b) => b.margin_pct - a.margin_pct)
                .slice(0, 10)
                .map((row) => ({
                  label: row.name,
                  value: row.margin_pct,
                  color: row.margin_pct >= 70 ? "#22c55e" : row.margin_pct >= 60 ? "#d4a853" : "#ef4444",
                }))}
              valueFormat={(v) => `${v.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* ── Create Drink Spec ── */}
      <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Create Drink Spec</p>
          <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Add a new versioned spec for a menu item to track cost accuracy.</p>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { label: "Location", field: (
                <select
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              )},
              { label: "Menu Item", field: (
                <select
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={selectedMenuItem}
                  onChange={(e) => setSelectedMenuItem(e.target.value)}
                >
                  <option value="">Select menu item</option>
                  {menuItems.filter((item) => selectedLocation ? item.location_id === selectedLocation : true).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              )},
              { label: "Glass Type", field: (
                <input
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={glassType}
                  onChange={(e) => setGlassType(e.target.value)}
                />
              )},
              { label: "Ice Type", field: (
                <input
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={iceType}
                  onChange={(e) => setIceType(e.target.value)}
                />
              )},
              { label: "Target Pour (oz)", field: (
                <input
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={targetPourOz}
                  onChange={(e) => setTargetPourOz(e.target.value)}
                />
              )},
              { label: "Notes", field: (
                <input
                  style={{ marginTop: 6, width: "100%", background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )},
            ].map(({ label, field }) => (
              <label key={label} style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e" }}>
                {label}
                {field}
              </label>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #1f2732", paddingTop: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 10 }}>Ingredient Lines</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lines.map((line, index) => (
                <div key={`line-${index}`} style={{ display: "flex", gap: 8 }}>
                  <select
                    style={{ flex: 2, background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                    value={line.ingredientId}
                    onChange={(e) => handleLineChange(index, "ingredientId", e.target.value)}
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                    ))}
                  </select>
                  <input
                    style={{ flex: 1, background: "#0b1016", border: "1px solid #2a3240", borderRadius: 6, color: "#f0f6fc", padding: "8px 12px", fontSize: 13 }}
                    placeholder="oz"
                    value={line.ounces}
                    onChange={(e) => handleLineChange(index, "ounces", e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleAddLine}
              style={{ marginTop: 8, fontSize: 12, color: "#d4a853", background: "transparent", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
            >
              + Add ingredient line
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-primary btn-sm" onClick={handleSubmitSpec}>Save Spec</button>
            {status && <p style={{ fontSize: 12, color: status === "Spec saved" ? "#22c55e" : "#8b949e" }}>{status}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
