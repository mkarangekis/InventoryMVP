"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { COMPANY_NAME } from "@/config/brand";

export default function OnboardingPage() {
  const [tenantName, setTenantName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (isMounted) {
        setHasSession(Boolean(data.session?.access_token));
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
  }, []);

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
      setStatus("Onboarding complete. You can open the dashboard next.");
    }

    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <p className="mt-2 text-sm text-gray-600">
        Create your tenant and first location in {COMPANY_NAME} (dev-only).
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700">
          Tenant name
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Location name
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Address
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Timezone
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
        </label>

        <button
          className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white"
          type="submit"
          disabled={loading || !hasSession}
        >
          {loading ? "Creating..." : "Create tenant + location"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-sm text-gray-700">
        <button
          className="rounded border border-gray-300 px-3 py-2"
          type="button"
          onClick={handleToken}
        >
          Show access token (dev)
        </button>
        {accessToken ? (
          <p className="break-words">Token: {accessToken}</p>
        ) : null}
      </div>

      {!hasSession ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Sign in required</p>
          <p className="mt-1 text-sm">
            Create your account or sign in to complete onboarding.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
              href="/login?mode=signup"
            >
              Create account
            </Link>
            <Link
              className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
              href="/login?mode=signin"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}

      {status ? (
        <p className="mt-4 text-sm text-gray-700">{status}</p>
      ) : null}
    </main>
  );
}
