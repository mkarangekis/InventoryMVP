"use client";

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

  return (
    <div className="enterprise-theme min-h-screen">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <div className="app-logo">P</div>
            <div className="app-brand-text">
              <span className="app-brand-name">{COMPANY_NAME}</span>
              <span className="app-brand-product">{PRODUCT_NAME}</span>
            </div>
          </div>
          <nav className="app-nav">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-link ${
                    isActive ? "app-nav-link-active" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="app-header-actions">
            <div className="demo-selector">DEMO ▾</div>
            <select
              className="demo-selector"
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
