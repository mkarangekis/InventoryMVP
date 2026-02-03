import type { Metadata } from "next";
import "./globals.css";
import { COMPANY_NAME, PRODUCT_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | ${COMPANY_NAME}`,
  description:
    "Predictive inventory and bar operations platform for POS ingestion, forecasting, and ordering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
