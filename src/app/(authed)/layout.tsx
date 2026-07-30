"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PRODUCT_NAME } from "@/config/brand";
import {
  isEnterpriseUIEnabled,
  isOperationsCenterEnabled,
} from "@/config/flags";
import EnterpriseShell from "@/components/enterprise/EnterpriseShell";
import { SubscriptionGuard } from "@/components/billing/SubscriptionGuard";

type Location = { id: string; name: string };

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocation, setActiveLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [operationsAccess, setOperationsAccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const sessionToken = data.session?.access_token ?? null;
      setToken(sessionToken);

      if (!sessionToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/locations", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          locations: Location[];
        };
        setLocations(payload.locations);
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("barops.locationId")
            : null;
        const defaultId = payload.locations[0]?.id ?? "";
        const nextId =
          stored && payload.locations.some((loc) => loc.id === stored)
            ? stored
            : defaultId;
        setActiveLocation(nextId);
        if (nextId && typeof window !== "undefined") {
          window.localStorage.setItem("barops.locationId", nextId);
        }
      }

      if (isOperationsCenterEnabled()) {
        const operationsResponse = await fetch("/api/v1/operations/access", {
          headers: { Authorization: `Bearer ${sessionToken}` },
          cache: "no-store",
        });
        setOperationsAccess(operationsResponse.ok);
      }

      setLoading(false);
    };

    void load();
  }, [router]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-content">
          <div className="page-loading-logo">P</div>
          <p className="page-loading-text">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="page-loading">
        <div className="page-loading-content">
          <div className="page-loading-logo">P</div>
          <p className="page-loading-text">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (isEnterpriseUIEnabled()) {
    return (
      <SubscriptionGuard token={token}>
        <EnterpriseShell
          locations={locations}
          activeLocation={activeLocation}
          onLocationChange={(next) => {
            setActiveLocation(next);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("barops.locationId", next);
              window.dispatchEvent(
                new CustomEvent("location-change", {
                  detail: { locationId: next },
                }),
              );
            }
          }}
          operationsAccess={operationsAccess}
        >
          {children}
        </EnterpriseShell>
      </SubscriptionGuard>
    );
  }

  return (
    <SubscriptionGuard token={token}>
      <div className="min-h-screen bg-zinc-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold">{PRODUCT_NAME}</span>
              <nav className="flex gap-3 text-sm text-gray-600">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/inventory">Inventory</Link>
                <Link href="/ingest">Ingest</Link>
                <Link href="/ordering">Ordering</Link>
                <Link href="/profit">Profit</Link>
                {operationsAccess ? (
                  <Link href="/operations">Operations</Link>
                ) : null}
              </nav>
            </div>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={activeLocation}
              onChange={(e) => {
                const next = e.target.value;
                setActiveLocation(next);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("barops.locationId", next);
                  window.dispatchEvent(
                    new CustomEvent("location-change", {
                      detail: { locationId: next },
                    }),
                  );
                }
              }}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </SubscriptionGuard>
  );
}
