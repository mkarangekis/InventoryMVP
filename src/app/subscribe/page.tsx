"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Entitlement } from "@/lib/billing/entitlement";

type ActionState = {
  loading: boolean;
  error: string | null;
};

export default function SubscribePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<ActionState>({
    loading: false,
    error: null,
  });
  const [portal, setPortal] = useState<ActionState>({
    loading: false,
    error: null,
  });

  const cta = useMemo(() => {
    const status = entitlement?.entitlementStatus ?? "unknown";
    if (status === "past_due") {
      return {
        title: "Payment Issue",
        subtitle:
          "Your subscription is past due. Update your payment method to restore access.",
      };
    }
    if (status === "canceled" || status === "inactive") {
      return {
        title: "Subscribe to Continue",
        subtitle:
          "Start a 14-day free trial to unlock forecasting, ordering recommendations, and variance insights.",
      };
    }
    return {
      title: "Checking Subscription",
      subtitle: "Loading your subscription status...",
    };
  }, [entitlement]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);

    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    setToken(accessToken);

    if (!accessToken) {
      setEntitlement(null);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/v1/billing/entitlement", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      setLoadError(await res.text());
      setEntitlement(null);
      setLoading(false);
      return;
    }

    const payload = (await res.json()) as Entitlement;
    setEntitlement(payload);
    setLoading(false);

    if (
      payload.entitlementStatus === "active" ||
      payload.entitlementStatus === "trialing"
    ) {
      router.replace("/dashboard");
    }
  };

  useEffect(() => {
    void load();
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTrial = async () => {
    if (!token) return;
    setCheckout({ loading: true, error: null });
    const res = await fetch("/api/v1/billing/create-checkout-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setCheckout({ loading: false, error: await res.text() });
      return;
    }
    const payload = (await res.json()) as { url?: string };
    if (!payload.url) {
      setCheckout({ loading: false, error: "Missing checkout URL." });
      return;
    }
    window.location.href = payload.url;
  };

  const handleManageBilling = async () => {
    if (!token) return;
    setPortal({ loading: true, error: null });
    const res = await fetch("/api/v1/billing/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setPortal({ loading: false, error: await res.text() });
      return;
    }
    const payload = (await res.json()) as { url?: string };
    if (!payload.url) {
      setPortal({ loading: false, error: "Missing portal URL." });
      return;
    }
    window.location.href = payload.url;
  };

  const status = entitlement?.entitlementStatus ?? "unknown";
  const showActions =
    status === "inactive" || status === "canceled" || status === "past_due";

  return (
    <main className="auth-layout">
      <div className="auth-bg">
        <div className="hero-gradient-orb hero-gradient-orb-1" />
        <div className="hero-gradient-orb hero-gradient-orb-2" />
        <div className="hero-grid-pattern" />
      </div>

      <div className="auth-container" style={{ maxWidth: "520px" }}>
        <div className="auth-brand">
          <div className="app-logo">P</div>
          <div className="app-brand-text">
            <span className="app-brand-name">{COMPANY_NAME}</span>
            <span className="app-brand-product">{PRODUCT_NAME}</span>
          </div>
        </div>

        <div className="auth-card">
          <p className="text-overline" style={{ color: "var(--color-accent-primary)" }}>
            {PRODUCT_NAME}
          </p>
          <h1 className="auth-title" style={{ marginTop: "var(--space-2)" }}>
            {cta.title}
          </h1>
          <p className="auth-subtitle">{cta.subtitle}</p>

          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-5) 0",
                color: "#9ca3af",
                fontSize: "var(--text-sm)",
              }}
            >
              <span className="spinner spinner-sm" />
              Checking subscription status…
            </div>
          ) : loadError ? (
            <div className="auth-status auth-status-error" style={{ marginTop: "var(--space-4)" }}>
              <p style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Couldn&apos;t load billing status
              </p>
              <p style={{ wordBreak: "break-word" }}>{loadError}</p>
              <button
                className="btn-secondary btn-sm"
                style={{ marginTop: "var(--space-3)" }}
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          ) : !token ? (
            <div className="auth-status auth-status-error" style={{ marginTop: "var(--space-4)" }}>
              <p style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Sign in required
              </p>
              <p>Please sign in to manage your subscription.</p>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <Link className="btn-primary btn-sm" href="/login?mode=signin">
                  Sign in
                </Link>
                <Link className="btn-secondary btn-sm" href="/login?mode=signup">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div className="sub-status-block">
                <div>
                  <div className="sub-status-label">Current status</div>
                  <div className="sub-status-value">{status}</div>
                </div>
                {entitlement?.trialEnd ? (
                  <div className="sub-status-date">
                    Trial ends {new Date(entitlement.trialEnd).toLocaleDateString()}
                  </div>
                ) : entitlement?.currentPeriodEnd ? (
                  <div className="sub-status-date">
                    Period ends{" "}
                    {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
                  </div>
                ) : null}
              </div>

              {showActions ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                  <button
                    className="btn-primary"
                    onClick={handleStartTrial}
                    disabled={checkout.loading}
                  >
                    {checkout.loading ? (
                      <span className="auth-loading">
                        <span className="spinner spinner-sm" />
                        Redirecting…
                      </span>
                    ) : (
                      "Start 14-day free trial →"
                    )}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleManageBilling}
                    disabled={portal.loading}
                  >
                    {portal.loading ? "Opening…" : "Manage billing"}
                  </button>
                </div>
              ) : (
                <div className="sub-active-block">
                  Your subscription is active. Redirecting to dashboard…
                </div>
              )}

              {checkout.error ? (
                <div className="auth-status auth-status-error">{checkout.error}</div>
              ) : null}
              {portal.error ? (
                <div className="auth-status auth-status-error">{portal.error}</div>
              ) : null}
            </div>
          )}

          <div className="auth-footer">
            <Link href="/login" className="auth-footer-link">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

