"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { COMPANY_NAME } from "@/config/brand";
import { isSubscriptionGatingEnabled } from "@/config/flags";

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Workspace",   icon: "🏢", desc: "Name your org and first location" },
  { id: 2, label: "POS Connect", icon: "🔗", desc: "Import your sales data" },
  { id: 3, label: "Inventory",   icon: "📦", desc: "Set up your first items" },
  { id: 4, label: "Go Live",     icon: "🚀", desc: "Launch your dashboard" },
] as const;

// ── Timezones list ────────────────────────────────────────────────────────────
const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Australia/Sydney", "Australia/Melbourne",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]           = useState(1);
  const [token, setToken]         = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Step 1 fields
  const [tenantName, setTenantName]     = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress]           = useState("");
  const [timezone, setTimezone]         = useState("America/New_York");

  // Step 2 state
  const [posFile, setPosFile]         = useState<File | null>(null);
  const [posUploading, setPosUploading] = useState(false);
  const [posImportId, setPosImportId]   = useState<string | null>(null);
  const [posSkipped, setPosSkipped]     = useState(false);

  // Step 3 state
  const [inventoryItems, setInventoryItems] = useState([
    { name: "", unit: "750ml bottle" },
  ]);

  // Check session on mount
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const t = data.session?.access_token ?? null;
      if (!mounted) return;
      setToken(t);
      setHasSession(Boolean(t));
      setChecking(false);

      if (t) {
        const res = await fetch("/api/onboarding/status", { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) {
          const { hasProfile } = await res.json() as { hasProfile: boolean };
          if (hasProfile) {
            if (isSubscriptionGatingEnabled()) {
              const ent = await fetch("/api/v1/billing/entitlement", { headers: { Authorization: `Bearer ${t}` } });
              const { entitlementStatus } = ent.ok ? await ent.json() as { entitlementStatus: string } : { entitlementStatus: "" };
              router.replace(entitlementStatus === "active" || entitlementStatus === "trialing" ? "/dashboard" : "/subscribe");
            } else {
              router.replace("/dashboard");
            }
          }
        }
      }
    };
    void check();
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(() => void check());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  // ── Step 1: Bootstrap workspace ───────────────────────────────────────────
  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/onboarding/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantName, locationName, address, timezone }),
    });
    setLoading(false);
    if (!res.ok) { setError(await res.text()); return; }
    setStep(2);
  };

  // ── Step 2: POS CSV upload ────────────────────────────────────────────────
  const submitStep2 = async () => {
    if (!posFile || !token) { setPosSkipped(true); setStep(3); return; }
    setPosUploading(true);
    const form = new FormData();
    form.append("file", posFile);
    const locationId = typeof window !== "undefined" ? window.localStorage.getItem("barops.locationId") : null;
    if (locationId) form.append("locationId", locationId);
    const res = await fetch("/api/ingest/csv", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    setPosUploading(false);
    if (res.ok) {
      const { runId } = await res.json() as { runId?: string };
      setPosImportId(runId ?? null);
    }
    setStep(3);
  };

  // ── Step 3: Inventory items ───────────────────────────────────────────────
  const submitStep3 = async () => {
    const validItems = inventoryItems.filter((i) => i.name.trim());
    if (!validItems.length) { setStep(4); return; }
    if (!token) { setStep(4); return; }

    setLoading(true);
    const locationId = typeof window !== "undefined"
      ? window.localStorage.getItem("barops.locationId") ?? undefined
      : undefined;

    try {
      await fetch("/api/onboarding/seed-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: validItems, locationId }),
      });
      // Non-critical — proceed to step 4 regardless of seed result
    } catch {}

    setLoading(false);
    setStep(4);
  };

  // ── Step 4: Go to dashboard ───────────────────────────────────────────────
  const finish = async () => {
    if (!token) return;
    if (isSubscriptionGatingEnabled()) {
      const ent = await fetch("/api/v1/billing/entitlement", { headers: { Authorization: `Bearer ${token}` } });
      const { entitlementStatus } = ent.ok ? await ent.json() as { entitlementStatus: string } : { entitlementStatus: "" };
      router.replace(entitlementStatus === "active" || entitlementStatus === "trialing" ? "/dashboard" : "/subscribe");
    } else {
      router.replace("/dashboard");
    }
  };

  if (checking) {
    return (
      <main className="auth-layout">
        <div className="auth-bg">
          <div className="hero-gradient-orb hero-gradient-orb-1" />
          <div className="hero-gradient-orb hero-gradient-orb-2" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px", color: "#9ca3af", fontSize: "14px" }}>
          <span className="spinner spinner-sm" /> Verifying session…
        </div>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <div className="auth-bg">
        <div className="hero-gradient-orb hero-gradient-orb-1" />
        <div className="hero-gradient-orb hero-gradient-orb-2" />
        <div className="hero-grid-pattern" />
      </div>

      <div style={{ width: "100%", maxWidth: "580px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Brand */}
        <div className="auth-brand" style={{ marginBottom: "32px" }}>
          <div className="app-logo">P</div>
          <div className="app-brand-text">
            <span className="app-brand-name">{COMPANY_NAME}</span>
            <span className="app-brand-product">Bar Ops</span>
          </div>
        </div>

        {/* Progress stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px", gap: "0" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "60px",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: step > s.id ? "14px" : "18px",
                  background: step > s.id ? "var(--color-accent-primary)" : step === s.id ? "var(--color-accent-primary)" : "var(--color-surface-elevated)",
                  border: `2px solid ${step >= s.id ? "var(--color-accent-primary)" : "var(--color-border)"}`,
                  color: step >= s.id ? "#0C0B09" : "var(--color-text-muted)",
                  transition: "all 0.3s",
                  fontWeight: 700,
                }}>
                  {step > s.id ? "✓" : s.icon}
                </div>
                <span style={{ fontSize: "10px", fontWeight: 600, color: step >= s.id ? "var(--color-accent-primary)" : "var(--color-text-muted)", textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: "2px", background: step > s.id ? "var(--color-accent-primary)" : "var(--color-border)", margin: "0 4px", marginBottom: "20px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="auth-card">

          {/* ── STEP 1: Workspace Setup ── */}
          {step === 1 && (
            <>
              <p className="text-overline" style={{ color: "var(--color-accent-primary)" }}>Step 1 of 4</p>
              <h1 className="auth-title" style={{ marginTop: "var(--space-1)" }}>Create Your Workspace</h1>
              <p className="auth-subtitle">Set up your organization and first bar location.</p>

              {!hasSession ? (
                <div className="auth-status auth-status-error" style={{ marginTop: "16px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "4px" }}>Sign in required</p>
                  <p>You need an account to continue.</p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <Link className="btn-primary btn-sm" href="/login?mode=signup">Create account</Link>
                    <Link className="btn-secondary btn-sm" href="/login?mode=signin">Sign in</Link>
                  </div>
                </div>
              ) : (
                <form className="auth-form" onSubmit={submitStep1}>
                  <div className="auth-form-group">
                    <label className="auth-label" htmlFor="tenant">Organization name</label>
                    <input id="tenant" className="input" required placeholder="Downtown Bar Group" value={tenantName} onChange={e => setTenantName(e.target.value)} />
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-label" htmlFor="loc">First location name</label>
                    <input id="loc" className="input" required placeholder="The Main Tap" value={locationName} onChange={e => setLocationName(e.target.value)} />
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-label" htmlFor="addr">Address</label>
                    <input id="addr" className="input" required placeholder="123 Main St, New York, NY" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-label" htmlFor="tz">Timezone</label>
                    <select id="tz" className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ cursor: "pointer" }}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  {error && <div className="auth-status auth-status-error">{error}</div>}
                  <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                    {loading ? <><span className="spinner spinner-sm" /> Creating workspace…</> : "Continue →"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── STEP 2: POS Connect ── */}
          {step === 2 && (
            <>
              <p className="text-overline" style={{ color: "var(--color-accent-primary)" }}>Step 2 of 4</p>
              <h1 className="auth-title" style={{ marginTop: "var(--space-1)" }}>Connect Your POS</h1>
              <p className="auth-subtitle">Import a CSV export from Square, Toast, or Clover — or skip for now and connect later.</p>

              <div style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
                {/* CSV Upload */}
                <div style={{ border: "2px dashed var(--color-border)", borderRadius: "12px", padding: "24px", textAlign: "center", background: "var(--color-surface-elevated)" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                  <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>Upload CSV Export</p>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>Drag & drop or click to browse. Supports Square, Toast, Clover exports.</p>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    id="pos-file"
                    style={{ display: "none" }}
                    onChange={e => setPosFile(e.target.files?.[0] ?? null)}
                  />
                  <label htmlFor="pos-file" className="btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {posFile ? `✓ ${posFile.name}` : "Browse file"}
                  </label>
                </div>

                {/* POS integrations coming soon */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {["Square", "Toast", "Clover"].map(pos => (
                    <div key={pos} style={{ border: "1px solid var(--color-border)", borderRadius: "10px", padding: "12px 8px", textAlign: "center", background: "var(--color-surface-elevated)", opacity: 0.6 }}>
                      <div style={{ fontSize: "20px", marginBottom: "4px" }}>🔌</div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-secondary)" }}>{pos}</div>
                      <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Live sync — coming soon</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
                <button
                  className="btn-primary auth-submit"
                  onClick={submitStep2}
                  disabled={posUploading}
                  style={{ flex: 1 }}
                >
                  {posUploading ? <><span className="spinner spinner-sm" /> Uploading…</> : posFile ? "Upload & Continue →" : "Skip for now →"}
                </button>
              </div>
              {posImportId && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-success)" }}>✓ Import started — you can track progress in Ingestion.</p>
              )}
            </>
          )}

          {/* ── STEP 3: Inventory Items ── */}
          {step === 3 && (
            <>
              <p className="text-overline" style={{ color: "var(--color-accent-primary)" }}>Step 3 of 4</p>
              <h1 className="auth-title" style={{ marginTop: "var(--space-1)" }}>Add Your Key Items</h1>
              <p className="auth-subtitle">Add a few of your highest-volume bottles to start tracking. You can add more from the Inventory page.</p>

              <div style={{ display: "grid", gap: "10px", marginTop: "20px" }}>
                {inventoryItems.map((item, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder={`e.g. Tito's Vodka`}
                      value={item.name}
                      onChange={e => {
                        const next = [...inventoryItems];
                        next[i] = { ...next[i], name: e.target.value };
                        setInventoryItems(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setInventoryItems(inventoryItems.filter((_, j) => j !== i))}
                      style={{ padding: "8px", background: "none", border: "1px solid var(--color-border)", borderRadius: "8px", cursor: "pointer", color: "var(--color-text-muted)", lineHeight: 1 }}
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setInventoryItems([...inventoryItems, { name: "", unit: "750ml bottle" }])}
                  style={{ justifyContent: "center" }}
                >
                  + Add another item
                </button>
              </div>

              <div style={{ marginTop: "24px", padding: "12px 16px", background: "var(--color-surface-elevated)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  💡 <strong style={{ color: "var(--color-text-secondary)" }}>Tip:</strong> Start with your top 5-10 volume items — typically house spirits, beer kegs, and top-selling cocktail ingredients. You can add full inventory from the Inventory page.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
                <button className="btn-ghost btn-sm" onClick={() => setStep(2)} style={{ padding: "10px 16px" }}>← Back</button>
                <button className="btn-primary auth-submit" onClick={submitStep3} style={{ flex: 1 }}>
                  {inventoryItems.some(i => i.name.trim()) ? "Save Items & Continue →" : "Skip & Continue →"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4: Go Live ── */}
          {step === 4 && (
            <>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🚀</div>
                <h1 className="auth-title">You're all set!</h1>
                <p className="auth-subtitle" style={{ maxWidth: "340px", margin: "8px auto 28px" }}>
                  Your workspace is ready. Head to the dashboard to see your first insights, run a variance check, and connect your POS data.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px", textAlign: "left" }}>
                  {[
                    { icon: "📊", title: "Dashboard", desc: "Variance flags + AI insights" },
                    { icon: "📦", title: "Inventory", desc: "Run your first count" },
                    { icon: "📄", title: "Ingest", desc: "Import POS history" },
                    { icon: "🛒", title: "Ordering", desc: "Review draft POs" },
                  ].map(item => (
                    <div key={item.title} style={{ padding: "14px", background: "var(--color-surface-elevated)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "20px", marginBottom: "6px" }}>{item.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-primary)" }}>{item.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{item.desc}</div>
                    </div>
                  ))}
                </div>

                {!posSkipped && posImportId && (
                  <div style={{ padding: "10px 16px", background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.2)", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", color: "var(--color-success)" }}>
                    ✓ POS import running in background — check Ingestion for status.
                  </div>
                )}

                <button className="btn-primary auth-submit" onClick={finish} style={{ width: "100%" }}>
                  Open Dashboard →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Step description */}
        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "var(--color-text-muted)" }}>
          {STEPS.find(s => s.id === step)?.desc}
        </p>
      </div>
    </main>
  );
}
