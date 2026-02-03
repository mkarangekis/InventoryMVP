"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PRODUCT_NAME } from "@/config/brand";
import { isEnterpriseUIEnabled } from "@/config/flags";
import EnterpriseShell from "@/components/enterprise/EnterpriseShell";

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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/locations", {
        headers: { Authorization: `Bearer ${token}` },
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

      setLoading(false);
    };

    void load();
  }, [router]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Loading...</main>;
  }

  if (isEnterpriseUIEnabled()) {
    return (
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
      >
        {children}
      </EnterpriseShell>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
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
  );
}
