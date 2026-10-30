export type PolicyId = "terms" | "privacy" | "charge" | "safety";
export const policyIds: PolicyId[] = ["terms", "privacy", "charge", "safety"];
export const policyLinks: Record<PolicyId, { title: { ko: string; en: string }; navLabel: { ko: string; en: string }; href: string; icon: string }> = {
  terms: { title: { ko: "Tada 이용약관", en: "Tada Terms of Service" }, navLabel: { ko: "이용약관", en: "Terms of Service" }, href: "/terms", icon: "ms-description" },
  privacy: { title: { ko: "Tada 개인정보 처리방침", en: "Tada Privacy Policy" }, navLabel: { ko: "개인정보 처리방침", en: "Privacy Policy" }, href: "/privacy", icon: "ms-security" },
  charge: { title: { ko: "Tada Charge 정책", en: "Tada Charge Policy" }, navLabel: { ko: "Charge 정책", en: "Charge Policy" }, href: "/charge-policy", icon: "ms-bolt" },
  safety: { title: { ko: "Tada 거래 안전 및 신고 정책", en: "Tada Transaction Safety and Reporting Policy" }, navLabel: { ko: "거래 안전·신고", en: "Safety & reporting" }, href: "/trade-safety", icon: "ms-shield" },
};
