import { PolicyDocumentPage } from "@/components/policies/PolicyDocumentPage";

export const metadata = { title: "Terms of Service (Draft)", robots: { index: false, follow: false } };
export default function TermsPage() { return <PolicyDocumentPage policyId="terms" />; }
