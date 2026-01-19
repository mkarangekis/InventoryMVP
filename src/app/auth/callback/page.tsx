"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        await supabaseBrowser.auth.exchangeCodeForSession(code);
      } else {
        await supabaseBrowser.auth.getSessionFromUrl({ storeSession: true });
      }

      router.replace("/onboarding");
    };

    void handleAuth();
  }, [router]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Signing you in...</h1>
      <p className="mt-2 text-sm text-gray-600">
        If this takes more than a few seconds, refresh the page.
      </p>
    </main>
  );
}