"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./landing-page.css";
import { LandingAnimations } from "@/components/LandingAnimations";

const BAR_DATA = [35, 52, 48, 70, 62, 80, 75, 45, 58, 90, 85, 68, 72, 65];

export default function LandingPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Nav hide/show on scroll
  useEffect(() => {
    let lastY = 0;
    let ticking = false;
    const nav = navRef.current;
    if (!nav) return;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          nav.style.boxShadow = y > 80 ? "0 1px 3px rgba(0,0,0,0.4)" : "none";
          if (y > lastY && y > 200) {
            nav.style.transform = "translateY(-100%)";
          } else {
            nav.style.transform = "translateY(0)";
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cursor glow
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const glow = document.getElementById("lpCursorGlow");
    if (!glow) return;
    let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      glow.style.opacity = "1";
    };
    const onLeave = () => { glow.style.opacity = "0"; };

    const animate = () => {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      glow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;
      raf = requestAnimationFrame(animate);
    };
    animate();

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const closeMobile = () => setMobileOpen(false);

  const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
  const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  return (
    <div className={`pourdex-lp${theme === "light" ? " theme-light" : ""}`}>
      <LandingAnimations />

      {/* Cursor glow */}
      <div className="cursor-glow" id="lpCursorGlow" aria-hidden="true" />

      {/* ── NAV ── */}
      <nav className="lp-nav" ref={navRef} role="navigation" aria-label="Main navigation">
        <div className="container lp-nav__inner">
          <a className="lp-nav__brand" href="/" aria-label="Pourdex Home">
            <div className="lp-nav__logo" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 4h10a2 2 0 012 2v1a8 8 0 01-3.5 6.6L14 15v3a2 2 0 01-2 2h-0a2 2 0 01-2-2v-3l-1.5-1.4A8 8 0 015 7V6a2 2 0 012-2z" fill="#0C0B09" stroke="#0C0B09" strokeWidth="1.5"/>
                <path d="M9 4V2M15 4V2M12 15v5" stroke="#0C0B09" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="lp-nav__brand-text">
              <span className="lp-nav__brand-name">Pourdex</span>
              <span className="lp-nav__brand-product">Bar Ops</span>
            </div>
          </a>

          <ul className="lp-nav__links" role="list">
            <li><a className="lp-nav__link" href="#features">Features</a></li>
            <li><a className="lp-nav__link" href="#how-it-works">How It Works</a></li>
            <li><a className="lp-nav__link" href="#pricing">Pricing</a></li>
          </ul>

          <div className="lp-nav__actions">
            <button className="lp-nav__theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link className="btn btn--ghost btn--sm" href="/login?mode=signin">Sign In</Link>
            <Link className="btn btn--primary btn--sm" href="/login?mode=signup">Start Free Trial</Link>
          </div>

          <button className="lp-nav__hamburger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-mobile-menu${mobileOpen ? " is-open" : ""}`} role="dialog" aria-label="Mobile navigation">
        <button className="lp-mobile-menu__close" aria-label="Close menu" onClick={closeMobile}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <a className="lp-mobile-menu__link" href="#features" onClick={closeMobile}>Features</a>
        <a className="lp-mobile-menu__link" href="#how-it-works" onClick={closeMobile}>How It Works</a>
        <a className="lp-mobile-menu__link" href="#pricing" onClick={closeMobile}>Pricing</a>
        <Link className="btn btn--primary btn--lg" href="/login?mode=signup" style={{ marginTop: "1rem" }} onClick={closeMobile}>
          Start Free Trial
        </Link>
      </div>

      <main id="main">

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero__bg">
            <img src="/assets/hero-bar.png" alt="" className="lp-hero__bg-img" loading="eager" />
            <div className="lp-hero__bg-overlay" />
            <div className="lp-hero__bg-grain" aria-hidden="true" />
            <div className="lp-hero__grid-pattern" aria-hidden="true" />
          </div>

          <div className="container lp-hero__inner">
            <div className="lp-hero__content">
              <div className="lp-hero__badge gs-reveal">
                <span className="lp-hero__badge-dot" />
                Now with Toast, Square &amp; Clover integrations
              </div>

              <h1 className="lp-hero__headline">
                <span className="lp-hero__line gs-headline">Stop Guessing.</span>
                <span className="lp-hero__line lp-hero__line--accent gs-headline">Start Knowing.</span>
              </h1>

              <p className="lp-hero__sub gs-reveal">
                Pourdex Bar Ops transforms your POS data into predictive intelligence. Know what to order, when to order it, and where your inventory is really going.
              </p>

              <div className="lp-hero__cta gs-reveal">
                <Link className="btn btn--primary btn--lg" href="/login?mode=signup">
                  Start Free Trial
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <a className="btn btn--ghost btn--lg" href="mailto:pourdex@augmentationcg.com">Schedule a Demo</a>
              </div>

              <div className="lp-hero__stats gs-reveal">
                <div className="lp-hero__stat">
                  <span className="lp-hero__stat-value" data-counter="85" data-suffix="%+">0</span>
                  <span className="lp-hero__stat-label">Forecast accuracy</span>
                </div>
                <div className="lp-hero__stat">
                  <span className="lp-hero__stat-value" data-counter="1200" data-prefix="$">0</span>
                  <span className="lp-hero__stat-label">Avg variance found / mo</span>
                </div>
                <div className="lp-hero__stat">
                  <span className="lp-hero__stat-value" data-counter="30" data-suffix="%">0</span>
                  <span className="lp-hero__stat-label">Fewer stockouts</span>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="lp-hero__visual gs-dashboard">
              <div className="lp-hero__dashboard">
                <div className="lp-hero__dash-header">
                  <span className="lp-hero__dash-title">Tonight&apos;s Snapshot</span>
                  <span className="lp-hero__dash-status">
                    <span className="lp-hero__dash-status-dot" /> POS Synced
                  </span>
                </div>
                <div className="lp-hero__dash-kpis">
                  <div className="lp-kpi-card">
                    <div className="lp-kpi-card__label">Flagged Items</div>
                    <div className="lp-kpi-card__value">7</div>
                    <div className="lp-kpi-card__delta lp-kpi-card__delta--warn">+2 vs last week</div>
                  </div>
                  <div className="lp-kpi-card">
                    <div className="lp-kpi-card__label">Forecasted Pour</div>
                    <div className="lp-kpi-card__value">412 oz</div>
                    <div className="lp-kpi-card__delta lp-kpi-card__delta--up">3% above baseline</div>
                  </div>
                  <div className="lp-kpi-card">
                    <div className="lp-kpi-card__label">Revenue Impact</div>
                    <div className="lp-kpi-card__value">$1.2k</div>
                    <div className="lp-kpi-card__delta lp-kpi-card__delta--up">Identified this month</div>
                  </div>
                </div>
                <div className="lp-hero__dash-chart">
                  <div className="lp-chart-header">
                    <span className="lp-chart-header__title">Weekly Volume Trend</span>
                    <span className="lp-chart-header__range">Last 14 days</span>
                  </div>
                  <div className="lp-mini-bars">
                    {BAR_DATA.map((val, i) => (
                      <div key={i} className="lp-mini-bar" style={{ height: `${val}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-hero__float lp-hero__float--1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                3 items need reorder
              </div>
              <div className="lp-hero__float lp-hero__float--2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5DAA45" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Inventory count saved
              </div>
            </div>
          </div>

          <div className="lp-hero__scroll-indicator" aria-hidden="true">
            <div className="lp-hero__scroll-line" />
          </div>
        </section>

        {/* ── IMAGE BREAK 1 ── */}
        <section className="lp-image-break" aria-hidden="true">
          <div className="lp-image-break__parallax">
            <img src="/assets/bar-shelf.png" alt="" className="lp-image-break__img" loading="lazy" decoding="async" />
          </div>
          <div className="lp-image-break__overlay" />
          <div className="lp-image-break__text container">
            <p className="lp-image-break__tagline gs-reveal">Every bottle. Every pour. Every dollar. Tracked.</p>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="lp-features">
          <div className="container">
            <div className="lp-section-header">
              <p className="lp-section-overline gs-reveal">Capabilities</p>
              <h2 className="lp-section-title gs-reveal">Six Engines.<br />One Platform.</h2>
              <p className="lp-section-sub gs-reveal">Everything you need to run a tighter bar, from POS sync to smart ordering.</p>
            </div>

            <div className="lp-bento">
              <div className="lp-bento__card lp-bento__card--wide gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                <h3 className="lp-bento__card-title">POS Integration</h3>
                <p className="lp-bento__card-desc">Capture every transaction, void, and modifier automatically. No manual spreadsheets. Your POS feeds directly into the intelligence engine.</p>
                <p className="lp-bento__card-meta">Toast · Square · Clover</p>
              </div>

              <div className="lp-bento__card gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2l-2 18h12l-2-18H8z"/><path d="M6 20h12"/><path d="M9 6h6"/>
                </svg>
                <h3 className="lp-bento__card-title">Drink Specs Engine</h3>
                <p className="lp-bento__card-desc">Map every recipe to pours and cost. Know what should have been used vs. what was.</p>
                <div className="lp-bento__visual">
                  <div className="lp-recipe-row"><span className="lp-recipe-row__name">Old Fashioned</span><span className="lp-recipe-row__spec">2.0 oz</span><span className="lp-recipe-row__cost">$2.84</span></div>
                  <div className="lp-recipe-row"><span className="lp-recipe-row__name">Margarita</span><span className="lp-recipe-row__spec">1.5 oz</span><span className="lp-recipe-row__cost">$2.12</span></div>
                  <div className="lp-recipe-row"><span className="lp-recipe-row__name">Negroni</span><span className="lp-recipe-row__spec">3.0 oz</span><span className="lp-recipe-row__cost">$3.46</span></div>
                </div>
                <p className="lp-bento__card-meta">5,000+ recipes pre-loaded</p>
              </div>

              <div className="lp-bento__card gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h3 className="lp-bento__card-title">Variance Detection</h3>
                <p className="lp-bento__card-desc">Reveal over-pouring, comps, and shrinkage before it hits your margins.</p>
                <div className="lp-bento__visual">
                  <ul className="lp-variance-list" role="list">
                    <li className="lp-variance-item"><span className="lp-variance-item__name">Tito&apos;s Vodka</span><span className="lp-variance-item__flag lp-variance-item__flag--over">+18% over</span></li>
                    <li className="lp-variance-item"><span className="lp-variance-item__name">Maker&apos;s Mark</span><span className="lp-variance-item__flag lp-variance-item__flag--over">+12% over</span></li>
                    <li className="lp-variance-item"><span className="lp-variance-item__name">Hendrick&apos;s</span><span className="lp-variance-item__flag lp-variance-item__flag--under">-6% under</span></li>
                  </ul>
                </div>
                <p className="lp-bento__card-meta">Avg $1,200/mo identified</p>
              </div>

              <div className="lp-bento__card gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3 className="lp-bento__card-title">Demand Forecasting</h3>
                <p className="lp-bento__card-desc">Forecast by day and hour to stay ahead of demand swings. Machine learning that improves with every pour.</p>
                <p className="lp-bento__card-meta">85%+ forecast accuracy</p>
              </div>

              <div className="lp-bento__card gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <h3 className="lp-bento__card-title">Smart Ordering</h3>
                <p className="lp-bento__card-desc">Auto-generate purchase recommendations from reorder points. Never run dry on a Friday night again.</p>
                <p className="lp-bento__card-meta">30% fewer stockouts</p>
              </div>

              <div className="lp-bento__card lp-bento__card--wide gs-card">
                <svg className="lp-bento__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                <h3 className="lp-bento__card-title">Margin Intelligence</h3>
                <p className="lp-bento__card-desc">Rank every menu item by actual profitability. See which drinks make money and which burn it. Refine your menu with data, not guesswork.</p>
                <p className="lp-bento__card-meta">3–5% margin lift on average</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── IMAGE BREAK 2 ── */}
        <section className="lp-image-break lp-image-break--tall" aria-hidden="true">
          <div className="lp-image-break__parallax">
            <img src="/assets/bar-overhead.png" alt="" className="lp-image-break__img" loading="lazy" decoding="async" />
          </div>
          <div className="lp-image-break__overlay" />
          <div className="lp-image-break__text container">
            <p className="lp-image-break__tagline gs-reveal">Built for the chaos of a Friday night rush.</p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="lp-how-it-works">
          <div className="container">
            <div className="lp-section-header" style={{ textAlign: "center", maxWidth: "560px", marginLeft: "auto", marginRight: "auto" }}>
              <p className="lp-section-overline gs-reveal">How It Works</p>
              <h2 className="lp-section-title gs-reveal">From Raw Data to<br />Real Intelligence</h2>
              <p className="lp-section-sub gs-reveal" style={{ marginLeft: "auto", marginRight: "auto" }}>Three steps between your POS and better decisions.</p>
            </div>
            <div className="lp-steps">
              <div className="lp-step gs-step">
                <div className="lp-step__number">01</div>
                <h3 className="lp-step__title">Connect Your POS</h3>
                <p className="lp-step__desc">Integrate with your existing system and ingest every sale automatically. Takes less than 10 minutes.</p>
                <div className="lp-step__connector" aria-hidden="true" />
              </div>
              <div className="lp-step gs-step">
                <div className="lp-step__number">02</div>
                <h3 className="lp-step__title">Map Your Recipes</h3>
                <p className="lp-step__desc">Define specs for pours, brands, and costs so expected usage is accurate. Pre-loaded with 5,000+ recipes.</p>
                <div className="lp-step__connector" aria-hidden="true" />
              </div>
              <div className="lp-step gs-step">
                <div className="lp-step__number">03</div>
                <h3 className="lp-step__title">Get Intelligence</h3>
                <p className="lp-step__desc">See variance, forecast, and ordering recommendations within 48 hours of connecting.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SPLIT VISUAL ── */}
        <section className="lp-split-visual">
          <div className="lp-split-visual__image">
            <img src="/assets/cocktail-detail.png" alt="A beautifully crafted cocktail" loading="lazy" decoding="async" />
          </div>
          <div className="lp-split-visual__content">
            <div className="lp-split-visual__inner">
              <p className="lp-section-overline gs-reveal">Built for Reality</p>
              <h2 className="lp-section-title gs-reveal" style={{ fontSize: "var(--lp-text-xl)" }}>Honest About What We Do</h2>
              <div className="lp-clarity__grid">
                <div className="lp-clarity__item gs-reveal">
                  <div className="lp-clarity__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 20V10M12 20V4M6 20v-6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="lp-clarity__item-title">Sales-Based Intelligence</p>
                    <p className="lp-clarity__item-desc">We calculate usage from your actual transactions, not physical weighing. More accurate, less hardware.</p>
                  </div>
                </div>
                <div className="lp-clarity__item gs-reveal">
                  <div className="lp-clarity__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  </div>
                  <div>
                    <p className="lp-clarity__item-title">Works With Your POS</p>
                    <p className="lp-clarity__item-desc">We integrate with your existing system. No rip-and-replace. No new hardware to install.</p>
                  </div>
                </div>
                <div className="lp-clarity__item gs-reveal">
                  <div className="lp-clarity__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="lp-clarity__item-title">Smarter Over Time</p>
                    <p className="lp-clarity__item-desc">Predictions improve as we learn your patterns. Week one is good. Month three is incredible.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="lp-pricing">
          <div className="container">
            <div className="lp-section-header" style={{ textAlign: "center", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
              <p className="lp-section-overline gs-reveal">Pricing</p>
              <h2 className="lp-section-title gs-reveal">Simple, Transparent Pricing</h2>
              <p className="lp-section-sub gs-reveal" style={{ marginLeft: "auto", marginRight: "auto" }}>Pay only for what you use. No long-term contracts.</p>
            </div>
            <div className="lp-pricing__cards">
              <div className="lp-pricing-card lp-pricing-card--featured gs-card">
                <div className="lp-pricing-card__badge">Most Popular</div>
                <h3 className="lp-pricing-card__name">Single Bar</h3>
                <div className="lp-pricing-card__price">
                  <span className="lp-pricing-card__amount">$500</span>
                  <span className="lp-pricing-card__period">/month</span>
                </div>
                <p className="lp-pricing-card__desc">Everything you need for one location</p>
                <ul className="lp-pricing-card__features" role="list">
                  <li>1 POS integration</li>
                  <li>Unlimited SKUs</li>
                  <li>Daily forecasts</li>
                  <li>Variance &amp; shrinkage detection</li>
                  <li>Auto ordering recommendations</li>
                  <li>Priority support</li>
                </ul>
                <Link className="btn btn--primary" href="/login?mode=signup">Start Free Trial</Link>
              </div>
              <div className="lp-pricing-card gs-card">
                <h3 className="lp-pricing-card__name">Enterprise</h3>
                <div className="lp-pricing-card__price">
                  <span className="lp-pricing-card__amount">Custom</span>
                </div>
                <p className="lp-pricing-card__desc">For multi-location groups</p>
                <ul className="lp-pricing-card__features" role="list">
                  <li>Multiple locations</li>
                  <li>Consolidated reporting</li>
                  <li>Custom integrations</li>
                  <li>Dedicated success manager</li>
                  <li>SLA guarantees</li>
                  <li>On-site training</li>
                </ul>
                <a className="btn btn--ghost" href="mailto:pourdex@augmentationcg.com">Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="lp-final-cta">
          <div className="lp-final-cta__bg">
            <img src="/assets/hero-bar.png" alt="" className="lp-final-cta__bg-img" loading="lazy" decoding="async" />
            <div className="lp-final-cta__bg-overlay" />
          </div>
          <div className="container">
            <div className="lp-final-cta__content gs-reveal">
              <h2 className="lp-final-cta__title">Ready to See What You&apos;re Missing?</h2>
              <p className="lp-final-cta__desc">Start a 14-day free trial. No credit card required. Get your first variance report within 48 hours.</p>
              <div className="lp-final-cta__actions">
                <Link className="btn btn--primary btn--lg" href="/login?mode=signup">Start Free Trial</Link>
                <span className="lp-final-cta__or">or</span>
                <a className="lp-final-cta__link" href="mailto:pourdex@augmentationcg.com">Schedule a Demo →</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="container">
          <div className="lp-footer__inner">
            <div className="lp-footer__brand">
              <a className="lp-nav__brand" href="/" aria-label="Pourdex Home">
                <div className="lp-nav__logo" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 4h10a2 2 0 012 2v1a8 8 0 01-3.5 6.6L14 15v3a2 2 0 01-2 2h-0a2 2 0 01-2-2v-3l-1.5-1.4A8 8 0 015 7V6a2 2 0 012-2z" fill="#0C0B09" stroke="#0C0B09" strokeWidth="1.5"/>
                    <path d="M9 4V2M15 4V2M12 15v5" stroke="#0C0B09" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="lp-nav__brand-text">
                  <span className="lp-nav__brand-name">Pourdex</span>
                  <span className="lp-nav__brand-product">Bar Ops</span>
                </div>
              </a>
              <p className="lp-footer__tagline">Predictive Inventory Intelligence for independent bars and restaurants.</p>
            </div>
            <div className="lp-footer__cols">
              <div>
                <p className="lp-footer__col-title">Product</p>
                <a className="lp-footer__link" href="#features">Features</a>
                <a className="lp-footer__link" href="#how-it-works">How It Works</a>
                <a className="lp-footer__link" href="#pricing">Pricing</a>
              </div>
              <div>
                <p className="lp-footer__col-title">Company</p>
                <a className="lp-footer__link" href="mailto:pourdex@augmentationcg.com">Contact Sales</a>
                <a className="lp-footer__link" href="mailto:pourdex@augmentationcg.com">Support</a>
              </div>
              <div>
                <p className="lp-footer__col-title">Account</p>
                <Link className="lp-footer__link" href="/login?mode=signin">Sign In</Link>
                <Link className="lp-footer__link" href="/login?mode=signup">Start Free Trial</Link>
              </div>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <span className="lp-footer__copy">&copy; 2026 Augmentation Consulting Group Inc. All rights reserved.</span>
            <div className="lp-footer__legal">
              <a className="lp-footer__link" href="/privacy">Privacy</a>
              <a className="lp-footer__link" href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
