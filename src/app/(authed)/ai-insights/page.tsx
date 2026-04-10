"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ── Types ─────────────────────────────────────────────────────────────────────

type PricingSuggestion = { drink: string; current_price: number; suggested_price: number; market_benchmark: number; monthly_revenue_gain: number; rationale: string; risk: string };
type PricingResponse = { suggestions: PricingSuggestion[]; summary: string; total_monthly_opportunity: number; market_tier: string; city: string };

type SeasonalSpecial = { name: string; tagline: string; ingredients: { ingredient: string; amount: string }[]; suggested_price: number; estimated_margin_pct: number; uses_overstock: boolean; bartender_pitch: string; seasonal_reason: string };
type SeasonalsResponse = { specials: SeasonalSpecial[]; season: string; holiday_window: string | null; seasonal_context: { holiday_label: string | null; occasion_notes: string } };

type VendorRec = { item: string; your_price: number; market_price: number; action: string; annual_savings: number; urgency: "low" | "med" | "high" };
type VendorResponse = { recommendations: VendorRec[]; summary: string; total_annual_savings: number; city: string; market_tier: string };

type DeadSkuRec = { item: string; signal: string; action: string; reason: string; suggested_replacement: string | null; monthly_savings: number };
type DeadSkuResponse = { recommendations: DeadSkuRec[]; summary: string; total_monthly_savings: number; total_carrying_cost_usd: number };

type MarginRec = { drink: string; problem: string; fix: string; fix_type: string; monthly_impact_usd: number; current_margin_pct: number; target_margin_pct: number; priority: "low" | "med" | "high" };
type MarginResponse = { recommendations: MarginRec[]; summary: string; total_monthly_impact: number };

type TabKey = "pricing" | "seasonal" | "vendors" | "menu" | "margin";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: string; tagline: string }[] = [
  { key: "pricing",  label: "Competitive Pricing",   icon: "↑$", tagline: "See where you're undercharging vs. your market" },
  { key: "seasonal", label: "Seasonal Specials",      icon: "🌿", tagline: "AI-generated specials that match the season and move your overstock" },
  { key: "vendors",  label: "Vendor Costs",           icon: "📦", tagline: "Find out if you're overpaying your distributors" },
  { key: "menu",     label: "Dead Menu Items",        icon: "✂️", tagline: "Items not selling that are costing you money to keep" },
  { key: "margin",   label: "Margin Engineering",     icon: "⚙️", tagline: "Recipe tweaks and pour adjustments to increase profit per drink" },
];

const urgencyColor = (u: string) => ({
  high: "var(--enterprise-red, #ef4444)",
  med:  "var(--enterprise-amber, #f59e0b)",
  low:  "var(--enterprise-muted, #8b949e)",
}[u] ?? "var(--enterprise-muted)");

const signalBadge = (signal: string) => {
  const map: Record<string, { label: string; color: string }> = {
    underpriced:      { label: "Underpriced",      color: "#ef4444" },
    room_to_increase: { label: "Room to Raise",    color: "#f59e0b" },
    at_market:        { label: "At Market",        color: "#22c55e" },
    premium:          { label: "Premium",          color: "#a78bfa" },
    overpaying:       { label: "Overpaying",       color: "#ef4444" },
    slightly_high:    { label: "Slightly High",    color: "#f59e0b" },
    great_price:      { label: "Great Price",      color: "#22c55e" },
    dead:             { label: "Not Ordered 90d",  color: "#ef4444" },
    dying:            { label: "Almost Dead",      color: "#f59e0b" },
    seasonal_mismatch:{ label: "Out of Season",    color: "#a78bfa" },
  };
  const s = map[signal] ?? { label: signal, color: "#8b949e" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: s.color, background: `${s.color}18`, borderRadius: 4, padding: "2px 7px" }}>
      {s.label}
    </span>
  );
};

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="app-card" style={style}>{children}</div>
);

const SummaryBanner = ({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) => (
  <div style={{ background: "var(--app-surface-elevated)", border: "1px solid var(--enterprise-border)", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--enterprise-muted)" }}>{icon} {label}</p>
    <p style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--enterprise-fg)", letterSpacing: "-0.02em" }}>{value}</p>
    {sub && <p style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>{sub}</p>}
  </div>
);

const LoadingCard = ({ label }: { label: string }) => (
  <Card>
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--enterprise-muted)" }}>Analyzing {label}…</p>
      <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginTop: 4, opacity: 0.6 }}>Claude is reviewing your data</p>
    </div>
  </Card>
);

const ErrorCard = ({ msg }: { msg: string }) => (
  <Card>
    <div style={{ padding: "32px", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--enterprise-muted)" }}>{msg}</p>
    </div>
  </Card>
);

// ── Tab content components ─────────────────────────────────────────────────────

function PricingTab({ data }: { data: PricingResponse }) {
  if (!data.suggestions?.length) return <ErrorCard msg={data.summary ?? "No pricing opportunities found — your prices look competitive."} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryBanner icon="📍" label="Your Market" value={data.city ?? "Unknown"} sub={`${data.market_tier ?? ""} tier`} />
        <SummaryBanner icon="💰" label="Monthly Opportunity" value={`$${(data.total_monthly_opportunity ?? 0).toFixed(0)}`} sub="if all suggestions applied" color="var(--enterprise-accent)" />
        <SummaryBanner icon="🍸" label="Drinks to Review" value={String(data.suggestions.length)} sub="underpriced vs. your market" />
      </div>
      {data.summary && (
        <Card>
          <div className="app-card-body">
            <p style={{ fontSize: 13, color: "var(--enterprise-muted)", lineHeight: 1.6 }}>{data.summary}</p>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.suggestions.map((s, i) => (
          <Card key={i}>
            <div className="app-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--enterprise-fg)" }}>{s.drink}</p>
                  <p style={{ fontSize: 12, color: "var(--enterprise-muted)", marginTop: 2 }}>
                    Current: <strong style={{ color: "var(--enterprise-fg)" }}>${s.current_price.toFixed(2)}</strong>
                    {" → "}
                    Suggested: <strong style={{ color: "var(--enterprise-accent)" }}>${s.suggested_price.toFixed(2)}</strong>
                    {" · "}Market benchmark: ${s.market_benchmark.toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--enterprise-accent)" }}>+${s.monthly_revenue_gain.toFixed(0)}<span style={{ fontSize: 11, fontWeight: 400 }}>/mo</span></p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--enterprise-muted)", lineHeight: 1.6 }}>{s.rationale}</p>
              {s.risk && <p style={{ fontSize: 11, color: "#f59e0b", background: "#f59e0b12", borderRadius: 6, padding: "4px 10px" }}>⚠ {s.risk}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SeasonalTab({ data }: { data: SeasonalsResponse }) {
  if (!data.specials?.length) return <ErrorCard msg="No seasonal specials generated yet — add more inventory data to unlock this." />;
  const seasonLabel = data.seasonal_context?.holiday_label ?? (data.season ? data.season.charAt(0).toUpperCase() + data.season.slice(1) : "Current Season");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryBanner icon="🗓" label="Season Window" value={seasonLabel} sub={data.seasonal_context?.occasion_notes?.slice(0, 60) + "…"} />
        <SummaryBanner icon="🍹" label="Specials Generated" value={String(data.specials.length)} sub="ready to add to your menu" />
        <SummaryBanner icon="📦" label="Using Overstock" value={String(data.specials.filter((s) => s.uses_overstock).length)} sub="specials use your excess inventory" color="var(--enterprise-accent)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {data.specials.map((s, i) => (
          <Card key={i}>
            <div className="app-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "var(--enterprise-fg)" }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: "var(--enterprise-accent)", marginTop: 2, fontStyle: "italic" }}>{s.tagline}</p>
                </div>
                {s.uses_overstock && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "#22c55e18", borderRadius: 4, padding: "2px 7px", textTransform: "uppercase" }}>Uses Overstock</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--enterprise-muted)" }}>Suggested Price</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--enterprise-accent)" }}>${s.suggested_price.toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--enterprise-muted)" }}>Margin</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: s.estimated_margin_pct >= 70 ? "#22c55e" : "#f59e0b" }}>{s.estimated_margin_pct.toFixed(0)}%</p>
                </div>
              </div>
              <div style={{ background: "var(--app-bg)", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--enterprise-muted)", marginBottom: 6 }}>Recipe</p>
                {(s.ingredients ?? []).map((ing, j) => (
                  <p key={j} style={{ fontSize: 12, color: "var(--enterprise-fg)" }}>· {ing.amount} {ing.ingredient}</p>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--enterprise-border)", paddingTop: 8 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--enterprise-muted)", marginBottom: 4 }}>Bartender Pitch</p>
                <p style={{ fontSize: 12, color: "var(--enterprise-fg)", lineHeight: 1.5, fontStyle: "italic" }}>"{s.bartender_pitch}"</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VendorTab({ data }: { data: VendorResponse }) {
  const recs = data.recommendations ?? [];
  if (!recs.length) return <ErrorCard msg={data.summary ?? "Your vendor pricing looks competitive — no major overpaying detected."} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryBanner icon="💸" label="Annual Savings Potential" value={`$${(data.total_annual_savings ?? 0).toFixed(0)}`} sub="if you switch to market pricing" color="var(--enterprise-accent)" />
        <SummaryBanner icon="📦" label="Items to Review" value={String(recs.length)} sub="overpaying on these ingredients" />
        <SummaryBanner icon="📍" label="Market" value={data.city ?? "Unknown"} sub={`${data.market_tier ?? ""} tier pricing applied`} />
      </div>
      {data.summary && (
        <Card><div className="app-card-body"><p style={{ fontSize: 13, color: "var(--enterprise-muted)", lineHeight: 1.6 }}>{data.summary}</p></div></Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recs.map((r, i) => (
          <Card key={i}>
            <div className="app-card-body" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--enterprise-fg)" }}>{r.item}</p>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: urgencyColor(r.urgency), display: "inline-block" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>
                  You pay <strong style={{ color: "#ef4444" }}>${r.your_price.toFixed(2)}</strong>
                  {" · "}Market rate: <strong style={{ color: "#22c55e" }}>${r.market_price.toFixed(2)}</strong>
                </p>
                <p style={{ fontSize: 12, color: "var(--enterprise-muted)", marginTop: 6, lineHeight: 1.5 }}>{r.action}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "var(--enterprise-accent)" }}>+${r.annual_savings.toFixed(0)}</p>
                <p style={{ fontSize: 11, color: "var(--enterprise-muted)" }}>annual savings</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DeadSkuTab({ data }: { data: DeadSkuResponse }) {
  const recs = data.recommendations ?? [];
  if (!recs.length) return <ErrorCard msg={data.summary ?? "Your menu is clean — all items are selling. No dead SKUs found."} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryBanner icon="🗑" label="Items to Cut" value={String(recs.filter((r) => r.action === "cut").length)} sub="removing saves you money immediately" color="#ef4444" />
        <SummaryBanner icon="✨" label="Run as Special" value={String(recs.filter((r) => r.action === "run_as_special").length)} sub="turn dead stock into cash" color="#f59e0b" />
        <SummaryBanner icon="💰" label="Monthly Savings" value={`$${(data.total_monthly_savings ?? 0).toFixed(0)}`} sub="by cutting dead inventory" color="var(--enterprise-accent)" />
      </div>
      {data.summary && (
        <Card><div className="app-card-body"><p style={{ fontSize: 13, color: "var(--enterprise-muted)", lineHeight: 1.6 }}>{data.summary}</p></div></Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recs.map((r, i) => {
          const actionColors: Record<string, string> = { cut: "#ef4444", run_as_special: "#f59e0b", replace: "#a78bfa", monitor: "#8b949e" };
          const actionLabels: Record<string, string> = { cut: "Cut from menu", run_as_special: "Run as special to clear", replace: "Replace it", monitor: "Monitor" };
          return (
            <Card key={i}>
              <div className="app-card-body" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--enterprise-fg)" }}>{r.item}</p>
                    {signalBadge(r.signal)}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--enterprise-muted)", lineHeight: 1.5 }}>{r.reason}</p>
                  {r.suggested_replacement && (
                    <p style={{ fontSize: 12, color: "var(--enterprise-accent)", marginTop: 4 }}>Replace with: {r.suggested_replacement}</p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: actionColors[r.action] ?? "#8b949e", background: `${actionColors[r.action] ?? "#8b949e"}18`, borderRadius: 4, padding: "3px 8px", textTransform: "uppercase" }}>
                    {actionLabels[r.action] ?? r.action}
                  </span>
                  {r.monthly_savings > 0 && (
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--enterprise-accent)" }}>saves ${r.monthly_savings.toFixed(0)}/mo</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MarginTab({ data }: { data: MarginResponse }) {
  const recs = data.recommendations ?? [];
  if (!recs.length) return <ErrorCard msg={data.summary ?? "All your recipes are already well-engineered. No margin opportunities found."} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryBanner icon="⚙️" label="Monthly Impact" value={`$${(data.total_monthly_impact ?? 0).toFixed(0)}`} sub="if all fixes applied" color="var(--enterprise-accent)" />
        <SummaryBanner icon="🍸" label="Drinks to Fix" value={String(recs.length)} sub="below 70% margin target" />
        <SummaryBanner icon="⚠" label="Over-Pour Issues" value={String(recs.filter((r) => r.fix_type === "enforce_jigger" || r.fix_type === "reduce_pour").length)} sub="bartender training needed" color="#f59e0b" />
      </div>
      {data.summary && (
        <Card><div className="app-card-body"><p style={{ fontSize: 13, color: "var(--enterprise-muted)", lineHeight: 1.6 }}>{data.summary}</p></div></Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recs.map((r, i) => (
          <Card key={i}>
            <div className="app-card-body" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--enterprise-fg)" }}>{r.drink}</p>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: urgencyColor(r.priority), display: "inline-block" }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--enterprise-muted)" }}>Current Margin</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: r.current_margin_pct < 60 ? "#ef4444" : r.current_margin_pct < 70 ? "#f59e0b" : "#22c55e" }}>{r.current_margin_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--enterprise-muted)" }}>Target</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--enterprise-muted)" }}>{r.target_margin_pct}%</p>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--enterprise-muted)", lineHeight: 1.5, marginBottom: 6 }}><strong style={{ color: "var(--enterprise-fg)" }}>Problem:</strong> {r.problem}</p>
                <p style={{ fontSize: 12, color: "var(--enterprise-fg)", lineHeight: 1.5 }}><strong>Fix:</strong> {r.fix}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "var(--enterprise-accent)" }}>+${r.monthly_impact_usd.toFixed(0)}</p>
                <p style={{ fontSize: 11, color: "var(--enterprise-muted)" }}>/month</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AiInsightsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pricing");
  const [token, setToken] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalsResponse | null>(null);
  const [vendors, setVendors] = useState<VendorResponse | null>(null);
  const [deadSku, setDeadSku] = useState<DeadSkuResponse | null>(null);
  const [margin, setMargin] = useState<MarginResponse | null>(null);

  const [loading, setLoading] = useState<Record<TabKey, boolean>>({ pricing: false, seasonal: false, vendors: false, menu: false, margin: false });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({ pricing: null, seasonal: null, vendors: null, menu: null, margin: null });

  const setTabLoading = (tab: TabKey, val: boolean) => setLoading((prev) => ({ ...prev, [tab]: val }));
  const setTabError = (tab: TabKey, val: string | null) => setErrors((prev) => ({ ...prev, [tab]: val }));

  useEffect(() => {
    const init = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const t = data.session?.access_token ?? null;
      setToken(t);
      const loc = typeof window !== "undefined" ? window.localStorage.getItem("barops.locationId") : null;
      setLocationId(loc);
    };
    void init();
    const handler = (e: Event) => setLocationId((e as CustomEvent<{ locationId: string }>).detail.locationId);
    window.addEventListener("location-change", handler);
    return () => window.removeEventListener("location-change", handler);
  }, []);

  const fetchTab = async (tab: TabKey) => {
    if (!token) return;
    const endpointMap: Record<TabKey, string> = {
      pricing:  "/api/v1/ai/competitive-pricing",
      seasonal: "/api/v1/ai/seasonal-specials",
      vendors:  "/api/v1/ai/vendor-benchmarks",
      menu:     "/api/v1/ai/dead-sku",
      margin:   "/api/v1/ai/margin-engineering",
    };
    const setterMap: Record<TabKey, (d: unknown) => void> = {
      pricing:  (d) => setPricing(d as PricingResponse),
      seasonal: (d) => setSeasonal(d as SeasonalsResponse),
      vendors:  (d) => setVendors(d as VendorResponse),
      menu:     (d) => setDeadSku(d as DeadSkuResponse),
      margin:   (d) => setMargin(d as MarginResponse),
    };
    const alreadyLoaded = { pricing: !!pricing, seasonal: !!seasonal, vendors: !!vendors, menu: !!deadSku, margin: !!margin };
    if (alreadyLoaded[tab]) return;

    setTabLoading(tab, true);
    setTabError(tab, null);
    const query = locationId ? `?locationId=${locationId}` : "";
    try {
      const res = await fetch(`${endpointMap[tab]}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setterMap[tab](data);
    } catch (err) {
      setTabError(tab, err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTabLoading(tab, false);
    }
  };

  useEffect(() => {
    if (token) void fetchTab(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, locationId]);

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  const renderContent = () => {
    const isLoading = loading[activeTab];
    const error = errors[activeTab];
    if (isLoading) return <LoadingCard label={activeTabMeta.label.toLowerCase()} />;
    if (error) return <ErrorCard msg={error} />;
    if (activeTab === "pricing" && pricing) return <PricingTab data={pricing} />;
    if (activeTab === "seasonal" && seasonal) return <SeasonalTab data={seasonal} />;
    if (activeTab === "vendors" && vendors) return <VendorTab data={vendors} />;
    if (activeTab === "menu" && deadSku) return <DeadSkuTab data={deadSku} />;
    if (activeTab === "margin" && margin) return <MarginTab data={margin} />;
    return <LoadingCard label={activeTabMeta.label.toLowerCase()} />;
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--enterprise-accent)", marginBottom: 4 }}>
              AI-Powered
            </p>
            <h1 className="enterprise-heading" style={{ fontSize: 24, fontWeight: 800 }}>AI Insights</h1>
            <p className="app-card-subtitle">
              Five analysis engines working on your data — pricing, seasonal specials, vendor costs, menu health, and margin optimization.
            </p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: activeTab === tab.key ? "1px solid var(--enterprise-accent)" : "1px solid var(--enterprise-border)",
              background: activeTab === tab.key ? "var(--enterprise-accent)18" : "var(--app-surface-elevated)",
              color: activeTab === tab.key ? "var(--enterprise-accent)" : "var(--enterprise-muted)",
              fontWeight: activeTab === tab.key ? 700 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab description */}
      <div style={{ padding: "10px 16px", background: "var(--app-surface-elevated)", border: "1px solid var(--enterprise-border)", borderRadius: 8 }}>
        <p style={{ fontSize: 13, color: "var(--enterprise-muted)" }}>
          <strong style={{ color: "var(--enterprise-fg)" }}>{activeTabMeta.label}:</strong> {activeTabMeta.tagline}
        </p>
      </div>

      {/* Tab content */}
      {renderContent()}
    </section>
  );
}
