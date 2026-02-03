const rawEnterpriseFlag =
  process.env.NEXT_PUBLIC_ENTERPRISE_UI ?? process.env.ENTERPRISE_UI ?? "";

export const isEnterpriseUIEnabled = () => rawEnterpriseFlag === "true";
