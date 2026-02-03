export const COMPANY_NAME = "Pourdex";
export const PRODUCT_NAME = "Pourdex Bar Ops";

// Legacy naming retained for internal references when needed.
export const LEGACY_COMPANY_NAME = "Bar Monetization & Automation System";
export const LEGACY_PRODUCT_NAME = "Bar Ops MVP";

export const BRAND = {
  company: {
    name: "Pourdex",
    legalName: "Augmentation Consulting Group Inc.",
    tagline: "Predictive Inventory Intelligence",
  },
  product: {
    name: "Bar Ops",
    fullName: "Pourdex Bar Ops",
    description:
      "AI-powered inventory intelligence for independent bars and restaurants",
    version: "1.0",
  },
  contact: {
    email: "hello@pourdex.com",
    sales: "sales@pourdex.com",
    support: "support@pourdex.com",
  },
  legal: {
    copyright: `© ${new Date().getFullYear()} Augmentation Consulting Group Inc. All rights reserved.`,
    privacyUrl: "/privacy",
    termsUrl: "/terms",
  },
} as const;
