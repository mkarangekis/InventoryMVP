"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";
import { isSubscriptionGatingEnabled } from "@/config/flags";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "signup" ? "signup" : "signin");
  }, []);

  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const redirectAfterAuth = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.replace(href);
      return;
    }

    router.replace(href);
  };

  const handleStartTrial = async (token: string) => {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const message = await response.text();
      setStatus(`Billing error: ${message}`);
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
    } else {
      setStatus("Billing error: missing checkout URL.");
    }
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    let errorMessage = "";
    let token: string | null = null;

    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${redirectBase}/auth/callback`,
          },
        });

        if (error) {
          errorMessage =
            typeof error.message === "string" && error.message.length > 0
              ? error.message
              : JSON.stringify(error);
        } else {
          token = signUpData.session?.access_token ?? null;

          const { data: signInData, error: signInError } =
            await supabaseBrowser.auth.signInWithPassword({
              email,
              password,
            });
          if (signInError) {
            errorMessage =
              typeof signInError.message === "string" &&
              signInError.message.length > 0
                ? signInError.message
                : JSON.stringify(signInError);
          } else {
            token = signInData.session?.access_token ?? token;
          }
        }
      } else {
        const { data: signInData, error } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          errorMessage =
            typeof error.message === "string" && error.message.length > 0
              ? error.message
              : JSON.stringify(error);
        } else {
          token = signInData.session?.access_token ?? null;
        }
      }

    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
    }

    if (errorMessage) {
      console.error("Auth error", errorMessage);
      const friendlyMessage = errorMessage.toLowerCase().includes("email not confirmed")
        ? "Check your inbox — we sent you a confirmation link. Click it, then sign in."
        : errorMessage.toLowerCase().includes("invalid login credentials") || errorMessage.toLowerCase().includes("invalid credentials")
        ? "Incorrect email or password."
        : errorMessage.toLowerCase().includes("user already registered")
        ? "An account with this email already exists. Try signing in instead."
        : `Error: ${errorMessage}`;
      setStatus(friendlyMessage);
    } else {
      if (!token) {
        const { data } = await supabaseBrowser.auth.getSession();
        token = data.session?.access_token ?? null;
      }

      if (!token) {
        setStatus(
          mode === "signup"
            ? "Almost there! Check your inbox for a confirmation link, then sign in."
            : "No active session. Check your credentials.",
        );
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        setStatus("Welcome! Let’s set up your first location.");
        await handleStartTrial(token);
        setLoading(false);
        return;
      }

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
                setStatus("Signed in. Redirecting to dashboard...");
                redirectAfterAuth("/dashboard");
                return;
              } else {
                setStatus("Subscription required. Redirecting...");
                redirectAfterAuth("/subscribe");
                return;
              }
            } else {
              setStatus("Subscription required. Redirecting...");
              redirectAfterAuth("/subscribe");
              return;
            }
          } else {
            setStatus("Signed in. Redirecting to dashboard...");
            redirectAfterAuth("/dashboard");
            return;
          }
        } else {
          setStatus("Welcome back! Let’s finish onboarding.");
          redirectAfterAuth("/onboarding");
          return;
        }
      } else {
        setStatus("Signed in. Redirecting to dashboard...");
        redirectAfterAuth("/dashboard");
        return;
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

      <div className="auth-container">
        <div className="auth-brand">
          <div className="app-logo">P</div>
          <div className="app-brand-text">
            <span className="app-brand-name">{COMPANY_NAME}</span>
            <span className="app-brand-product">{PRODUCT_NAME}</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-mode-toggle">
            <button
              type="button"
              className={`auth-mode-btn${mode === "signin" ? " auth-mode-btn-active" : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-mode-btn${mode === "signup" ? " auth-mode-btn-active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>

          <h1 className="auth-title">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="auth-subtitle">
            {mode === "signup"
              ? "Start your 14-day free trial. No credit card required."
              : "Sign in to your intelligence dashboard."}
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            {mode === "signup" ? (
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="input"
                  type="text"
                  required
                  placeholder="yourname"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            ) : null}

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                placeholder="you@yourbar.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                required
                placeholder={
                  mode === "signup" ? "Create a strong password" : "Your password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button
              className="btn-primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-loading">
                  <span className="spinner spinner-sm" />
                  {mode === "signup" ? "Creating account…" : "Signing in…"}
                </span>
              ) : mode === "signup" ? (
                "Start Free Trial →"
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          {status ? (
            <div
              className={`auth-status${
                status.toLowerCase().includes("error") ||
                status.toLowerCase().includes("billing") ||
                status.toLowerCase().includes("incorrect")
                  ? " auth-status-error"
                  : status.toLowerCase().includes("welcome") ||
                      status.toLowerCase().includes("signed in")
                    ? " auth-status-success"
                    : " auth-status-info"
              }`}
            >
              {status}
            </div>
          ) : null}

          <div className="auth-footer">
            {mode === "signin" ? (
              <span>
                No account?{" "}
                <button
                  type="button"
                  className="auth-footer-link"
                  onClick={() => setMode("signup")}
                >
                  Start free trial
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-footer-link"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
