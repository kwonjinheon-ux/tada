import Link from "next/link";
export default function SignUpPage() { return <main className="page-shell" style={{ maxWidth: 520, paddingBlock: 96 }}><h1>Create account</h1><p>Create an account securely through Supabase Auth.</p><Link className="button button-primary" href="/sign-in">Sign in</Link></main>; }
