import { PolicyDocumentPage } from "@/components/policies/PolicyDocumentPage";

export const metadata = { title: "Privacy Policy (Draft)", robots: { index: false, follow: false } };
export default function PrivacyPage() { return <PolicyDocumentPage policyId="privacy" />; }
