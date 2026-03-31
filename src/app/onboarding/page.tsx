"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { COMPANY_NAME } from "@/config/brand";
import { isSubscriptionGatingEnabled } from "@/config/flags";

export default function OnboardingPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (isMounted) {
        setHasSession(Boolean(token));
        setChecking(false);
      }

      if (token) {
        const statusRes = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.ok) {
          const payload = (await statusRes.json()) as { hasProfile: boolean };
          if (payload.hasProfile) {
            if (isSubscriptionGatingEnabled()) {
              const entitlementRes = await fetch("/api/v1/billing/entitlement", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (entitlementRes.ok) {
                const ent = (await entitlementRes.json()) as {
                  entitlementStatus: string;
                };
                if (
                  ent.entitlementStatus === "active" ||
                  ent.entitlementStatus === "trialing"
                ) {
                  router.replace("/dashboard");
                } else {
                  router.replace("/subscribe");
                }
              } else {
                router.replace("/subscribe");
              }
            } else {
              router.replace("/dashboard");
            }
          }
        }
      }
    };
    void loadSession();
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      () => {
        void loadSession();
      },
    );
    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const handleToken = async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token ?? null;
    setAccessToken(token);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setStatus("You must be logged in before onboarding.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/onboarding/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tenantName, locationName, address, timezone }),
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus(`Error: ${message}`);
    } else {
      setStatus("Onboarding complete. Redirecting to the dashboard...");
      if (isSubscriptionGatingEnabled()) {
        const entitlementRes = await fetch("/api/v1/billing/entitlement", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (entitlementRes.ok) {
          const ent = (await entitlementRes.json()) as {
            entitlementStatus: string;
          };
          if (
            ent.entitlementStatus === "active" ||
            ent.entitlementStatus === "trialing"
          ) {
            router.replace("/dashboard");
          } else {
            router.replace("/subscribe");
          }
        } else {
          router.replace("/subscribe");
        }
      } else {
        router.replace("/dashboard");
      }
    }

    setLoading(false);
  };

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
            <span className="app-brand-product">Bar Ops</span>
          </div>
        </div>

        <div className="auth-card">
          <p className="text-overline" style={{ color: "var(--color-accent-primary)" }}>
            Workspace Setup
          </p>
          <h1 className="auth-title" style={{ marginTop: "var(--space-1)" }}>
            Set Up Your Workspace
          </h1>
          <p className="auth-subtitle">
            Create your organization and first bar location to get started.
          </p>

          {checking ? (
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
              Verifying your session…
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="tenant-name">
                  Organization name
                </label>
                <input
                  id="tenant-name"
                  className="input"
                  required
                  placeholder="Downtown Bar Group"
                  value={tenantName}
                  onChange={(event) => setTenantName(event.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label" htmlFor="location-name">
                  First location name
                </label>
                <input
                  id="location-name"
                  className="input"
                  required
                  placeholder="The Main Tap"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label" htmlFor="address">
                  Address
                </label>
                <input
                  id="address"
                  className="input"
                  required
                  placeholder="123 Main St, New York, NY"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label" htmlFor="timezone">
                  Timezone
                </label>
                <input
                  id="timezone"
                  className="input"
                  required
                  placeholder="America/New_York"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                />
              </div>

              <button
                className="btn-primary auth-submit"
                type="submit"
                disabled={loading || !hasSession}
              >
                {loading ? (
                  <span className="auth-loading">
                    <span className="spinner spinner-sm" />
                    Creating workspace…
                  </span>
                ) : (
                  "Create Workspace →"
                )}
              </button>
            </form>
          )}

          {!hasSession ? (
            <div className="auth-status auth-status-error" style={{ marginTop: "var(--space-4)" }}>
              <p style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Sign in required
              </p>
              <p>Create your account or sign in to complete onboarding.</p>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <Link className="btn-primary btn-sm" href="/login?mode=signup">
                  Create account
                </Link>
                <Link className="btn-secondary btn-sm" href="/login?mode=signin">
                  Sign in
                </Link>
              </div>
            </div>
          ) : null}

          {status ? (
            <div
              className={`auth-status${
                status.toLowerCase().includes("error")
                  ? " auth-status-error"
                  : " auth-status-success"
              }`}
              style={{ marginTop: "var(--space-4)" }}
            >
              {status}
            </div>
          ) : null}

          <div className="auth-footer">
            <button
              className="btn-ghost btn-sm"
              type="button"
              style={{ fontSize: "var(--text-xs)", color: "#6b7280" }}
              onClick={handleToken}
            >
              Show access token (dev)
            </button>
            {accessToken ? (
              <p
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: "#9ca3af",
                  wordBreak: "break-all",
                  fontFamily: "var(--font-family-mono)",
                }}
              >
                {accessToken}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
