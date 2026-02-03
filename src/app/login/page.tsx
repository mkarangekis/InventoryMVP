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
  const [username, setUsername] = useState("");
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

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    let errorMessage = "";

    try {
      if (mode === "signup") {
        const { error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${redirectBase}/auth/callback`,
          },
        });

        if (error) {
          errorMessage =
            typeof error.message === "string" && error.message.length > 0
              ? error.message
              : JSON.stringify(error);
        }
      } else {
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
      }

    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
    }

    if (errorMessage) {
      console.error("Auth error", errorMessage);
      setStatus(`Error: ${errorMessage}`);
    } else {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setStatus(
          "Account created, but email confirmation is still required. Disable confirm email in Supabase Auth to auto-login.",
        );
        setLoading(false);
        return;
      }

      const statusRes = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statusRes.ok) {
        const payload = (await statusRes.json()) as { hasProfile: boolean };
        if (payload.hasProfile) {
          setStatus("Signed in. Redirecting to dashboard...");
          router.replace("/dashboard");
        } else {
          setStatus("Welcome! Let’s set up your first location.");
          router.replace("/onboarding");
        }
      } else {
        setStatus("Signed in. Redirecting to dashboard...");
        router.replace("/dashboard");
      }
    }

    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {mode === "signup" ? "Create account" : "Sign in"} to {PRODUCT_NAME}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Use a username and password to access your account.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          className={`rounded-full px-4 py-1 text-xs font-semibold ${
            mode === "signin"
              ? "bg-black text-white"
              : "border border-gray-300 text-gray-700"
          }`}
          type="button"
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          className={`rounded-full px-4 py-1 text-xs font-semibold ${
            mode === "signup"
              ? "bg-black text-white"
              : "border border-gray-300 text-gray-700"
          }`}
          type="button"
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleAuth}>
        {mode === "signup" ? (
          <label className="block text-sm font-medium text-gray-700">
            Username
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
        ) : null}
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
          Password
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            type="password"
            required
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
              ? "Working..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </div>
      </form>

      {status ? (
        <p className="mt-4 text-sm text-gray-700">{status}</p>
      ) : null}
    </main>
  );
}
