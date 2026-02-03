"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PRODUCT_NAME } from "@/config/brand";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
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

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    let errorMessage = "";

    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback`,
        },
      });

      if (error) {
        errorMessage =
          typeof error.message === "string" && error.message.length > 0
            ? error.message
            : JSON.stringify(error);
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
    }

    if (errorMessage) {
      console.error("Magic link error", errorMessage);
      setStatus(`Error: ${errorMessage}`);
    } else {
      setStatus(
        mode === "signup"
          ? "Check your email to confirm your account and finish signup."
          : "Check your email for the sign-in link.",
      );
    }

    setLoading(false);
  };

  const handlePasswordLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    let errorMessage = "";

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        errorMessage =
          typeof error.message === "string" && error.message.length > 0
            ? error.message
            : JSON.stringify(error);
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
    }

    if (errorMessage) {
      console.error("Password login error", errorMessage);
      setStatus(`Error: ${errorMessage}`);
    } else {
      setStatus("Signed in. Redirecting to dashboard...");
      router.replace("/dashboard");
    }

    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {mode === "signup" ? "Create account" : "Sign in"} to {PRODUCT_NAME}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Magic link auth via Supabase. Links return to the production site.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleLogin}>
        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Password (optional)
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <div className="space-y-2">
          <button
            className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending..."
              : mode === "signup"
                ? "Send signup link"
                : "Send sign-in link"}
          </button>
        </div>
      </form>

      <form className="mt-4" onSubmit={handlePasswordLogin}>
        <button
          className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-semibold"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in with password"}
        </button>
      </form>

      {status ? (
        <p className="mt-4 text-sm text-gray-700">{status}</p>
      ) : null}
    </main>
  );
}
