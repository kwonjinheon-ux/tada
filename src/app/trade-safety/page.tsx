import { PolicyDocumentPage } from "@/components/policies/PolicyDocumentPage";

export const metadata = { title: "Transaction Safety and Reporting Policy (Draft)", robots: { index: false, follow: false } };
export default function TradeSafetyPage() { return <PolicyDocumentPage policyId="safety" />; }
