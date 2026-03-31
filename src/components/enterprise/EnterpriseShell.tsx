"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Location = { id: string; name: string };

type NavItem = {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
};

const OverviewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const InventoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const OrderingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const VarianceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IngestIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ProfitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LocationPinIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    description: "Variance and near-term demand",
    icon: <OverviewIcon />,
  },
  {
    label: "Inventory",
    href: "/inventory",
    description: "Quick counts",
    icon: <InventoryIcon />,
  },
  {
    label: "Ordering",
    href: "/ordering",
    description: "Draft purchase orders",
    icon: <OrderingIcon />,
  },
  {
    label: "Variance",
    href: "/variance",
    description: "Shrink + variance flags",
    icon: <VarianceIcon />,
  },
  {
    label: "Ingestion",
    href: "/ingest",
    description: "POS imports",
    icon: <IngestIcon />,
  },
  {
    label: "Profit",
    href: "/profit",
    description: "Menu rankings",
    icon: <ProfitIcon />,
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Workspace controls",
    icon: <SettingsIcon />,
  },
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
  const router = useRouter();

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  };

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
                  className={`app-nav-link${isActive ? " app-nav-link-active" : ""}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="app-header-actions">
            {locations.length > 0 ? (
              <div className="location-selector">
                <LocationPinIcon />
                <select
                  className="location-select"
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
            ) : null}

            <button
              type="button"
              className="app-header-signout"
              onClick={() => void handleSignOut()}
              title="Sign out"
            >
              <SignOutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
