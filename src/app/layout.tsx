import type { Metadata } from "next";
import "./globals.css";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | ${COMPANY_NAME}`,
  description:
    "Predictive inventory and bar operations platform for POS ingestion, forecasting, and ordering.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: PRODUCT_NAME, statusBarStyle: "black-translucent" },
};

const runtimeFlags = {
  ENTERPRISE_UI: process.env.ENTERPRISE_UI,
  AI_TOP_PANEL: process.env.AI_TOP_PANEL,
  GRAPHS_OVERVIEW: process.env.GRAPHS_OVERVIEW,
  SUBSCRIPTION_GATING: process.env.SUBSCRIPTION_GATING,
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@300,400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BAROPS_FLAGS=${JSON.stringify(runtimeFlags)};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
