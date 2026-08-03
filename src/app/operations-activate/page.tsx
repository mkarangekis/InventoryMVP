"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { operationsAccessFailureMessage } from "@/operations/auth/redirect";

export default function OperationsActivatePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const verifyInvitationSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.replace("/operations-login");
        return;
      }
      setReady(true);
    };

    void verifyInvitationSession();
  }, [router]);

  const activate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (password.length < 12) {
      setStatus("Use at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setStatus("The passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    if (error) {
      setStatus(
        error.message ||
          "The password could not be saved. Request a new invite.",
      );
      setLoading(false);
      return;
    }

    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("Password saved. Sign in with your new password.");
      setLoading(false);
      return;
    }

    const accessResponse = await fetch("/api/v1/operations/access", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (accessResponse.ok) {
      setStatus("Account activated. Opening Operations Center...");
      window.location.replace("/operations");
      return;
    }

    setStatus(
      `Password saved. ${operationsAccessFailureMessage(accessResponse.status)}`,
    );
    setLoading(false);
  };

  if (!ready) {
    return (
      <main className="page-loading">
        <div className="page-loading-content">
          <div className="page-loading-logo">P</div>
          <p className="page-loading-text">Verifying invitation…</p>
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

      <div className="auth-container">
        <div className="auth-brand">
          <div className="app-logo">P</div>
          <div className="app-brand-text">
            <span className="app-brand-name">{COMPANY_NAME}</span>
            <span className="app-brand-product">{PRODUCT_NAME}</span>
          </div>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">Activate Operations account</h1>
          <p id="operations-password-requirements" className="auth-subtitle">
            Choose the password for your dedicated administrator account. Use at
            least 12 characters.
          </p>

          <form className="auth-form" onSubmit={activate} aria-busy={loading}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                aria-describedby="operations-password-requirements"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="password-confirmation">
                Confirm password
              </label>
              <input
                id="password-confirmation"
                className="input"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                aria-describedby="operations-password-requirements"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>

            <button
              className="btn-primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Activating…" : "Activate account →"}
            </button>
          </form>

          {status ? (
            <div
              id="operations-activation-status"
              className="auth-status auth-status-info"
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
