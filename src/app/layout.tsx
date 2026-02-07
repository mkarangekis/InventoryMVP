import type { Metadata } from "next";
import "./globals.css";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | ${COMPANY_NAME}`,
  description:
    "Predictive inventory and bar operations platform for POS ingestion, forecasting, and ordering.",
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
      <body className="antialiased">
        <script
          // Expose server env flags to client components at runtime without
          // requiring NEXT_PUBLIC_* env vars.
          dangerouslySetInnerHTML={{
            __html: `window.__BAROPS_FLAGS=${JSON.stringify(runtimeFlags)};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
