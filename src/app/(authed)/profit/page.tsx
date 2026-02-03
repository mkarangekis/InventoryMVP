"use client";

import { useEffect, useState } from "react";
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
    } else {
      const message = await profitRes.text();
      setStatus(`Profit data error: ${message}`);
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
      const message = await response.text();
      setStatus(`Error: ${message}`);
      return;
    }

    setStatus("Spec saved");
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Menu Profit Ranking</h1>
      <p className="text-sm text-gray-600">
        Ranked by profit per serving with margin and recommendations.
      </p>
      {status ? <p className="text-sm text-red-600">{status}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--enterprise-muted)]">
          Loading profit ranking...
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--enterprise-muted)]">
          No sales data yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)]">
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
                  <td className="px-3 py-2">${row.price_each}</td>
                  <td className="px-3 py-2">${row.cost_per_serv}</td>
                  <td className="px-3 py-2">${row.profit_per_serv}</td>
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

      <div className="rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-4">
        <h2 className="text-lg font-semibold">Create Drink Spec</h2>
        <p className="text-sm text-gray-600">
          Add a new versioned spec for a menu item.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                  selectedLocation ? item.location_id === selectedLocation : true,
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
          <button
            className="rounded border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] px-2 py-1 text-xs"
            onClick={handleAddLine}
          >
            Add ingredient line
          </button>
        </div>

        <button
          className="mt-4 rounded bg-[var(--app-accent)] px-3 py-2 text-xs font-semibold text-white"
          onClick={handleSubmitSpec}
        >
          Save spec
        </button>

        {status ? <p className="mt-2 text-sm text-gray-700">{status}</p> : null}
      </div>
    </section>
  );
}
