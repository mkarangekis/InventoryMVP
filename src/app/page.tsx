"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BRAND, PRODUCT_NAME } from "@/config/brand";

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
    <main className="min-h-screen">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-headline">Stop Guessing. Start Knowing.</h1>
          <p className="hero-subheadline">
            {PRODUCT_NAME} transforms your POS data into predictive
            intelligence. Know what to order, when to order it, and where your
            inventory is really going.
          </p>
          <div className="hero-cta">
            <Link className="btn-primary btn-lg" href="/login?mode=signup">
              Start Free Trial
            </Link>
            <Link className="btn-secondary btn-lg" href="/login?mode=signin">
              Sign In
            </Link>
          </div>
          <p className="hero-proof">
            Trusted by independent bars • built for high-velocity operations
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-panel">
            <p className="text-overline">Tonight’s Snapshot</p>
            <h2 className="text-h2">Variance & Forecast</h2>
            <div className="hero-metrics">
              <div className="metric-card metric-card-accent">
                <p className="metric-card-label">Flagged items</p>
                <p className="metric-card-value">7</p>
                <p className="metric-card-change metric-card-change-negative">
                  +2 vs last week
                </p>
              </div>
              <div className="metric-card">
                <p className="metric-card-label">Forecasted pour</p>
                <p className="metric-card-value">412 oz</p>
                <p className="metric-card-change metric-card-change-positive">
                  3% above baseline
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="value-props">
        <div className="value-props-header">
          <p className="text-overline">Why Bar Ops</p>
          <h2 className="text-h2">Everything You Need to Run Smarter</h2>
        </div>
        <div className="value-props-grid">
          {[
            {
              title: "POS Integration",
              desc:
                "Capture every transaction, void, and modifier automatically. No manual spreadsheets.",
              tone: "secondary",
            },
            {
              title: "Drink Specs Engine",
              desc:
                "Map every recipe to pours and cost. Know what should have been used.",
              tone: "primary",
            },
            {
              title: "Variance Detection",
              desc:
                "Reveal over-pouring, comps, and shrinkage before it hits margins.",
              tone: "warning",
            },
            {
              title: "Demand Forecasting",
              desc:
                "Forecast by day and hour to stay ahead of demand swings.",
              tone: "info",
            },
            {
              title: "Smart Ordering",
              desc:
                "Auto-generate purchase recommendations from reorder points.",
              tone: "success",
            },
            {
              title: "Margin Intelligence",
              desc:
                "Rank menu items by profitability and refine what you sell.",
              tone: "primary",
            },
          ].map((card) => (
            <div key={card.title} className="value-card">
              <div
                className={`value-card-icon value-card-icon-${card.tone}`}
              />
              <h3 className="value-card-title">{card.title}</h3>
              <p className="value-card-description">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <div className="how-it-works-header">
          <p className="text-overline">How It Works</p>
          <h2 className="text-h2">From Raw Data to Real Intelligence</h2>
          <p className="how-it-works-subtitle">
            Three steps between your POS and better decisions.
          </p>
        </div>
        <div className="how-it-works-steps">
          {[
            {
              number: "1",
              title: "Connect Your POS",
              body:
                "Integrate with your existing system and ingest every sale automatically.",
            },
            {
              number: "2",
              title: "Map Your Recipes",
              body:
                "Define specs for pours, brands, and costs so expected usage is accurate.",
            },
            {
              number: "3",
              title: "Get Intelligence",
              body:
                "See variance, forecast, and ordering recommendations within days.",
            },
          ].map((step, index) => (
            <div key={step.number} className="step">
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              {index < 2 ? <div className="step-connector" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="clarity-section">
        <div className="clarity-container">
          <h2 className="text-h2">What Bar Ops Is Not</h2>
          <p className="clarity-intro">
            Honest expectations keep teams aligned.
          </p>
          <div className="clarity-grid">
            {[
              "Not real-time tracking — forecasts are based on historical usage.",
              "Not a scale system — we calculate depletion from sales data.",
              "Not magic — predictions improve as we learn your patterns.",
              "Not a POS replacement — we integrate with what you already use.",
            ].map((text) => (
              <div key={text} className="clarity-item clarity-item-negative">
                <div className="clarity-icon">✕</div>
                <div>
                  <strong>{text.split(" — ")[0]}</strong>
                  <p>{text.split(" — ")[1]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-content">
          <h2>Ready to See What You’re Missing?</h2>
          <p>
            Start a 14-day free trial. No credit card required. Get your first
            variance report within 48 hours.
          </p>
          <div className="final-cta-actions">
            <Link className="btn-primary btn-lg" href="/login?mode=signup">
              Start Free Trial
            </Link>
            <span className="final-cta-or">or</span>
            <a className="final-cta-link" href="mailto:sales@pourdex.com">
              Schedule a Demo →
            </a>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <span>{BRAND.legal.copyright}</span>
      </footer>
    </main>
  );
}
