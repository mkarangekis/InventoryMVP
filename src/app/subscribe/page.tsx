"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT_NAME } from "@/config/brand";
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
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-[var(--enterprise-border,#e5e7eb)] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {PRODUCT_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{cta.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{cta.subtitle}</p>

        {loading ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Loading…
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Couldn’t load billing status</p>
            <p className="mt-1 break-words">{loadError}</p>
            <button
              className="mt-3 rounded border border-amber-300 bg-white px-3 py-2 text-xs font-semibold"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : !token ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold">Sign in required</p>
            <p className="mt-1">
              Please sign in to manage your subscription.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
                href="/login?mode=signin"
              >
                Sign in
              </Link>
              <Link
                className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
                href="/login?mode=signup"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase text-gray-500">
                    Current status
                  </div>
                  <div className="mt-1 font-semibold">{status}</div>
                </div>
                {entitlement?.trialEnd ? (
                  <div className="text-xs text-gray-600">
                    Trial ends{" "}
                    {new Date(entitlement.trialEnd).toLocaleDateString()}
                  </div>
                ) : entitlement?.currentPeriodEnd ? (
                  <div className="text-xs text-gray-600">
                    Period ends{" "}
                    {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
                  </div>
                ) : null}
              </div>
            </div>

            {showActions ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
                  onClick={handleStartTrial}
                  disabled={checkout.loading}
                >
                  {checkout.loading ? "Redirecting…" : "Start 14-day free trial"}
                </button>
                <button
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold"
                  onClick={handleManageBilling}
                  disabled={portal.loading}
                >
                  {portal.loading ? "Opening…" : "Manage billing"}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                If this looks wrong, contact support.
              </div>
            )}

            {checkout.error ? (
              <p className="text-sm text-amber-900">{checkout.error}</p>
            ) : null}
            {portal.error ? (
              <p className="text-sm text-amber-900">{portal.error}</p>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

