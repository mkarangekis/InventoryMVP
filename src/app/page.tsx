"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.location.hash.includes("access_token")) {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        supabaseBrowser.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => router.replace("/onboarding"));
      }
    }
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">
        Bar Monetization & Automation System
      </h1>
      <p className="mt-4 text-base text-gray-600">
        MVP scaffold is live. Next: auth, onboarding, and POS ingestion.
      </p>
    </main>
  );
}
