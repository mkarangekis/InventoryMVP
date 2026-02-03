"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

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
        {PRODUCT_NAME}
      </h1>
      <p className="mt-4 text-base text-gray-600">
        {COMPANY_NAME} MVP scaffold is live. Next: auth, onboarding, and POS
        ingestion.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
          href="/login?mode=signin"
        >
          Sign in
        </Link>
        <Link
          className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold"
          href="/login?mode=signup"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
