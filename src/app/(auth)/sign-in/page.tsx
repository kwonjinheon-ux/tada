import Link from "next/link";
export default function SignInPage() { return <main className="page-shell" style={{ maxWidth: 520, paddingBlock: 96 }}><h1>Welcome back</h1><p>Authentication will be connected through Supabase Auth.</p><Link className="button button-primary" href="/market">Continue to market</Link></main>; }
