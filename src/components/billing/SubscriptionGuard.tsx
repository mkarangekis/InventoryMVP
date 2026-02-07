"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isSubscriptionGatingEnabled } from "@/config/flags";
import type { Entitlement } from "@/lib/billing/entitlement";

type SubscriptionGuardProps = {
  token: string;
  children: ReactNode;
};

export function SubscriptionGuard({ token, children }: SubscriptionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/billing/entitlement", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(await res.text());
        setEntitlement(null);
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as Entitlement;
      setEntitlement(payload);
      setLoading(false);

      const ok =
        payload.entitlementStatus === "active" ||
        payload.entitlementStatus === "trialing";
      if (!ok) {
        const reason = payload.entitlementStatus;
        router.replace(`/subscribe?reason=${encodeURIComponent(reason)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : JSON.stringify(e));
      setEntitlement(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSubscriptionGatingEnabled()) {
      setLoading(false);
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pathname]);

  if (!isSubscriptionGatingEnabled()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        Loading subscription…
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Subscription check failed</p>
          <p className="mt-1 break-words">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
              onClick={() => void load()}
            >
              Retry
            </button>
            <Link
              className="rounded border border-amber-300 bg-white px-3 py-2 text-xs font-semibold"
              href="/subscribe"
            >
              Go to paywall
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const ok =
    entitlement?.entitlementStatus === "active" ||
    entitlement?.entitlementStatus === "trialing";
  if (!ok) {
    // Redirect will run, render nothing to avoid flicker.
    return null;
  }

  return <>{children}</>;
}

