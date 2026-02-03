"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

type Location = { id: string; name: string };

type NavItem = {
  label: string;
  href: string;
  description: string;
};

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    description: "Variance and near-term demand",
  },
  { label: "Inventory", href: "/inventory", description: "Quick counts" },
  {
    label: "Ordering",
    href: "/ordering",
    description: "Draft purchase orders",
  },
  {
    label: "Variance",
    href: "/variance",
    description: "Shrink + variance flags",
  },
  { label: "Ingestion", href: "/ingest", description: "POS imports" },
  { label: "Profit", href: "/profit", description: "Menu rankings" },
  { label: "Settings", href: "/settings", description: "Workspace controls" },
];

const labelMap: Record<string, string> = {
  dashboard: "Overview",
  inventory: "Inventory",
  ordering: "Ordering",
  variance: "Variance & Shrink",
  ingest: "Ingestion",
  profit: "Profit",
  settings: "Settings",
  login: "Login",
  onboarding: "Onboarding",
};

type EnterpriseShellProps = {
  children: React.ReactNode;
  locations: Location[];
  activeLocation: string;
  onLocationChange: (nextId: string) => void;
};

export default function EnterpriseShell({
  children,
  locations,
  activeLocation,
  onLocationChange,
}: EnterpriseShellProps) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [];
    }
    const items = segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = labelMap[segment] ?? segment;
      return { href, label };
    });
    return items;
  }, [pathname]);

  return (
    <div className="enterprise-theme min-h-screen">
      <div className="flex min-h-screen">
        <aside
          className={`relative hidden min-h-screen border-r border-[var(--enterprise-border)] bg-white/80 backdrop-blur md:block ${
            collapsed ? "w-20" : "w-72"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--enterprise-accent)] text-white">
                P
              </div>
              {!collapsed ? (
                <div className="leading-tight">
                  <p className="enterprise-heading text-lg font-semibold">
                    {COMPANY_NAME}
                  </p>
                  <p className="text-xs text-[var(--enterprise-muted)]">
                    {PRODUCT_NAME}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <nav className="px-3">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-[var(--enterprise-accent-soft)] text-[var(--enterprise-accent)]"
                      : "text-[var(--enterprise-ink)] hover:bg-white"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--enterprise-warm)]" />
                  {collapsed ? null : (
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-[var(--enterprise-muted)]">
                        {item.description}
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-3 right-3 rounded-2xl border border-[var(--enterprise-border)] bg-white p-3">
            {collapsed ? (
              <button
                className="w-full rounded-lg border border-[var(--enterprise-border)] py-2 text-xs"
                onClick={() => setCollapsed(false)}
              >
                Expand
              </button>
            ) : (
              <button
                className="w-full rounded-lg border border-[var(--enterprise-border)] py-2 text-xs"
                onClick={() => setCollapsed(true)}
              >
                Collapse sidebar
              </button>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-[var(--enterprise-border)] bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f5f9)]">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--enterprise-muted)]">
                  {PRODUCT_NAME}
                </p>
                <h1 className="enterprise-heading text-2xl font-semibold">
                  {labelMap[pathname.split("/")[1] ?? "dashboard"] ??
                    "Overview"}
                </h1>
                {breadcrumbs.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--enterprise-muted)]">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={crumb.href} className="flex items-center gap-2">
                        {index > 0 ? <span className="opacity-40">/</span> : null}
                        <Link
                          className="hover:text-[var(--enterprise-ink)]"
                          href={crumb.href}
                        >
                          {crumb.label}
                        </Link>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--enterprise-border)] bg-white px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--enterprise-muted)]">
                    Active location
                  </p>
                  <select
                    className="mt-1 rounded border border-[var(--enterprise-border)] bg-white px-2 py-1 text-sm"
                    value={activeLocation}
                    onChange={(event) => onLocationChange(event.target.value)}
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hidden items-center gap-2 text-xs text-[var(--enterprise-muted)] md:flex">
                  <span className="h-2 w-2 rounded-full bg-[var(--enterprise-accent)]" />
                  Secure session
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
