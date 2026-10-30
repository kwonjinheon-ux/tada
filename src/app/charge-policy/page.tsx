import { PolicyDocumentPage } from "@/components/policies/PolicyDocumentPage";

export const metadata = { title: "Tada Charge Policy (Draft)", robots: { index: false, follow: false } };
export default function ChargePolicyPage() { return <PolicyDocumentPage policyId="charge" />; }
