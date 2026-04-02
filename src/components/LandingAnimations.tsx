"use client";

import { useEffect } from "react";

export function LandingAnimations() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      const { default: gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { ScrollToPlugin } = await import("gsap/ScrollToPlugin");

      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

      // Respect reduced motion
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // ── Hero Entrance ──
      const heroTL = gsap.timeline({ delay: 0.3 });
      heroTL
        .from(".lp-hero__badge",  { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" })
        .from(".gs-headline",     { opacity: 0, y: 60, duration: 0.9, ease: "power3.out", stagger: 0.15 }, "-=0.3")
        .from(".lp-hero__sub",    { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" }, "-=0.4")
        .from(".lp-hero__cta",    { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .from(".lp-hero__stat",   { opacity: 0, y: 20, duration: 0.5, ease: "power3.out", stagger: 0.1 }, "-=0.3")
        .from(".gs-dashboard",    { opacity: 0, x: 60, duration: 1,   ease: "power3.out" }, "-=0.8")
        .from(".lp-hero__float",  { opacity: 0, scale: 0.8, duration: 0.6, ease: "back.out(1.5)", stagger: 0.15 }, "-=0.4")
        .from(".lp-hero__scroll-indicator", { opacity: 0, y: -10, duration: 0.5 }, "-=0.2");

      // ── Counter Animation ──
      document.querySelectorAll<HTMLElement>("[data-counter]").forEach((el) => {
        const target = parseInt(el.getAttribute("data-counter") ?? "0", 10);
        const prefix = el.getAttribute("data-prefix") ?? "";
        const suffix = el.getAttribute("data-suffix") ?? "";
        const obj = { val: 0 };

        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              val: target,
              duration: 1.6,
              ease: "power2.out",
              onUpdate: () => {
                const v = Math.round(obj.val);
                el.textContent = prefix + (v >= 1000 ? v.toLocaleString("en-US") : v) + suffix;
              },
            });
          },
        });
      });

      // ── Parallax image breaks ──
      gsap.utils.toArray<HTMLElement>(".lp-image-break__parallax").forEach((el) => {
        gsap.to(el, {
          yPercent: -15,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // ── General reveal ──
      gsap.utils.toArray<HTMLElement>(".gs-reveal").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // ── Bento cards stagger ──
      ScrollTrigger.batch(".gs-card", {
        start: "top 88%",
        once: true,
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0, y: 50, scale: 0.97,
            duration: 0.7, ease: "power3.out", stagger: 0.1,
          });
        },
      });

      // ── Steps stagger ──
      ScrollTrigger.batch(".gs-step", {
        start: "top 85%",
        once: true,
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0, y: 40,
            duration: 0.7, ease: "power3.out", stagger: 0.2,
          });
        },
      });

      // ── Split visual image zoom ──
      gsap.utils.toArray<HTMLElement>(".lp-split-visual__image img").forEach((img) => {
        gsap.from(img, {
          scale: 1.15,
          ease: "none",
          scrollTrigger: {
            trigger: img.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // ── Hero bg parallax ──
      gsap.to(".lp-hero__bg-img", {
        yPercent: 20,
        ease: "none",
        scrollTrigger: {
          trigger: ".lp-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // ── Dashboard float on scroll ──
      gsap.to(".lp-hero__dashboard", {
        y: -15,
        ease: "none",
        scrollTrigger: {
          trigger: ".lp-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // ── Final CTA bg parallax ──
      gsap.to(".lp-final-cta__bg-img", {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: ".lp-final-cta",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // ── Mini bar chart entrance ──
      ScrollTrigger.create({
        trigger: ".lp-hero__dash-chart",
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.from(".lp-mini-bar", {
            scaleY: 0,
            transformOrigin: "bottom",
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.04,
          });
        },
      });

      // ── KPI cards pop-in ──
      ScrollTrigger.create({
        trigger: ".lp-hero__dash-kpis",
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.from(".lp-kpi-card", {
            opacity: 0, y: 15, scale: 0.95,
            duration: 0.5, ease: "back.out(1.3)", stagger: 0.12,
          });
        },
      });

      // ── Smooth scroll for anchor links ──
      const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
      const handleClick = function (this: HTMLAnchorElement, e: Event) {
        const href = this.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          gsap.to(window, { duration: 1, scrollTo: { y: target, offsetY: 80 }, ease: "power3.inOut" });
        }
      };
      anchors.forEach((a) => a.addEventListener("click", handleClick));

      cleanup = () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
        anchors.forEach((a) => a.removeEventListener("click", handleClick));
      };
    }

    init().catch(console.error);
    return () => cleanup?.();
  }, []);

  return null;
}
