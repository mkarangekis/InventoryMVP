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
        <div className="hero-bg">
          <div className="hero-gradient-orb hero-gradient-orb-1" />
          <div className="hero-gradient-orb hero-gradient-orb-2" />
          <div className="hero-gradient-orb hero-gradient-orb-3" />
          <div className="hero-grid-pattern" />
        </div>
        <div className="hero-content">
          <div className="hero-badge animate-in">
            <span className="hero-badge-dot" />
            Now with Toast, Square & Clover integrations
          </div>
          <h1 className="hero-headline animate-in stagger-1">
            <span className="text-gradient">Stop Guessing.</span>
            <br />
            <span className="text-gradient-accent">Start Knowing.</span>
          </h1>
          <p className="hero-subheadline animate-in stagger-2">
            {PRODUCT_NAME} transforms your POS data into predictive
            intelligence. Know what to order, when to order it, and where your
            inventory is really going.
          </p>
          <div className="hero-cta animate-in stagger-3">
            <Link className="btn-primary btn-lg btn-glow" href="/login?mode=signup">
              Start Free Trial <span className="btn-arrow">→</span>
            </Link>
            <a className="btn-secondary btn-lg" href="mailto:sales@pourdex.com">
              Watch Demo
            </a>
          </div>
          <div className="hero-proof animate-in stagger-4">
          </div>
        </div>
        <div className="hero-visual animate-in">
          <div className="hero-card glass border-gradient">
            <div className="hero-card-header">
              <span className="text-overline">Tonight’s Snapshot</span>
              <h3>Variance & Forecast</h3>
            </div>
            <div className="hero-card-metrics">
              <div>
                <span className="hero-metric-label">Flagged Items</span>
                <span className="hero-metric-value">7</span>
                <span className="hero-metric-change positive">
                  +2 vs last week
                </span>
              </div>
              <div>
                <span className="hero-metric-label">Forecasted Pour</span>
                <span className="hero-metric-value">412 oz</span>
                <span className="hero-metric-change positive">
                  3% above baseline
                </span>
              </div>
            </div>
          </div>
          <div className="hero-floating-card hero-floating-card-1 glass">
            <span className="status-dot status-dot-success" />
            <span>POS Synced</span>
          </div>
          <div className="hero-floating-card hero-floating-card-2 glass">
            <span>⚡</span>
            <span>3 items need reorder</span>
          </div>
        </div>
      </section>

      <section className="value-props">
        <div className="value-props-header">
          <p className="text-overline text-gradient-accent">Why Bar Ops</p>
          <h2 className="text-h2">Everything You Need to Run Smarter</h2>
          <p className="text-body-sm">
            Six powerful capabilities. One intelligent platform.
          </p>
        </div>
        <div className="value-props-grid">
          {[
            {
              title: "POS Integration",
              desc:
                "Capture every transaction, void, and modifier automatically. No manual spreadsheets.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 7h10v10H7z" strokeWidth="2" />
                  <path d="M3 12h4M17 12h4" strokeWidth="2" />
                </svg>
              ),
              color: "var(--color-accent-secondary)",
              footer: "Toast • Square • Clover",
            },
            {
              title: "Drink Specs Engine",
              desc:
                "Map every recipe to pours and cost. Know what should have been used.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 3h6l-1 6 3 12H7l3-12z" strokeWidth="2" />
                </svg>
              ),
              color: "var(--color-accent-primary)",
              footer: "5,000+ recipes pre-loaded",
            },
            {
              title: "Variance Detection",
              desc:
                "Reveal over-pouring, comps, and shrinkage before it hits margins.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7z" strokeWidth="2" />
                </svg>
              ),
              color: "var(--color-status-warning)",
              footer: "Avg $1,200/mo identified",
            },
            {
              title: "Demand Forecasting",
              desc:
                "Forecast by day and hour to stay ahead of demand swings.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 16l4-5 4 3 4-6 4 5" strokeWidth="2" />
                </svg>
              ),
              color: "var(--color-status-info)",
              footer: "85%+ forecast accuracy",
            },
            {
              title: "Smart Ordering",
              desc:
                "Auto-generate purchase recommendations from reorder points.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 6h15l-1.5 9h-12z" strokeWidth="2" />
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                </svg>
              ),
              color: "var(--color-status-success)",
              footer: "30% fewer stockouts",
            },
            {
              title: "Margin Intelligence",
              desc:
                "Rank menu items by profitability and refine what you sell.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12h14M12 5v14" strokeWidth="2" />
                </svg>
              ),
              color: "var(--color-accent-primary)",
              footer: "3-5% margin lift",
            },
          ].map((card, index) => (
            <div
              key={card.title}
              className={`value-card animate-in stagger-${index + 1}`}
              style={{ ["--icon-color" as string]: card.color }}
            >
              <div className="value-card-icon">{card.icon}</div>
              <h3 className="value-card-title">{card.title}</h3>
              <p className="value-card-description">{card.desc}</p>
              <div className="text-body-sm">{card.footer}</div>
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
          <h2 className="text-h2">Built for Reality</h2>
          <p className="clarity-intro">
            Honest about what we do—and what makes us different.
          </p>
          <div className="clarity-grid">
            {[
              {
                icon: "📊",
                title: "Sales-Based Intelligence",
                body:
                  "We calculate usage from your actual transactions, not physical weighing. More accurate, less hardware.",
              },
              {
                icon: "🔌",
                title: "Works With Your POS",
                body:
                  "We integrate with your existing system. No rip-and-replace. No new hardware to install.",
              },
              {
                icon: "📈",
                title: "Smarter Over Time",
                body:
                  "Predictions improve as we learn your patterns. Week one is good. Month three is incredible.",
              },
            ].map((item) => (
              <div key={item.title} className="clarity-item">
                <div className="clarity-icon">{item.icon}</div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
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
      <section className="pricing">
        <div className="pricing-header">
          <p className="text-overline">Pricing</p>
          <h2 className="text-h2">Simple, Transparent Pricing</h2>
          <p className="pricing-subtitle">
            Pay only for what you use. No long-term contracts.
          </p>
        </div>
        <div className="pricing-cards">
          {[
            {
              name: "Starter",
              price: "$149",
              desc: "For single-location bars",
              features: [
                "1 POS integration",
                "Up to 500 SKUs",
                "Weekly forecasts",
                "Basic variance reports",
                "Email support",
              ],
              primary: false,
              cta: "Start Free Trial",
            },
            {
              name: "Professional",
              price: "$299",
              desc: "For serious operators",
              features: [
                "1 POS integration",
                "Unlimited SKUs",
                "Daily forecasts",
                "Advanced variance & shrinkage",
                "Auto ordering recommendations",
                "Priority support",
              ],
              primary: true,
              cta: "Start Free Trial",
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "For multi-location groups",
              features: [
                "Multiple locations",
                "Consolidated reporting",
                "Custom integrations",
                "Dedicated success manager",
                "SLA guarantees",
                "On-site training",
              ],
              primary: false,
              cta: "Contact Sales",
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`pricing-card ${tier.primary ? "pricing-card-featured" : ""}`}
            >
              {tier.primary ? <div className="pricing-badge">Most Popular</div> : null}
              <div className="pricing-card-header">
                <h3>{tier.name}</h3>
                <p className="pricing-price">
                  <span className="pricing-amount">{tier.price}</span>
                  {tier.price !== "Custom" ? (
                    <span className="pricing-period">/month</span>
                  ) : null}
                </p>
                <p className="pricing-description">{tier.desc}</p>
              </div>
              <ul className="pricing-features">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {tier.primary ? (
                <Link className="btn-primary" href="/login?mode=signup" style={{ width: "100%" }}>
                  {tier.cta}
                </Link>
              ) : tier.cta === "Contact Sales" ? (
                <a className="btn-secondary" href="mailto:sales@pourdex.com" style={{ width: "100%" }}>
                  {tier.cta}
                </a>
              ) : (
                <Link className="btn-secondary" href="/login?mode=signup" style={{ width: "100%" }}>
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
