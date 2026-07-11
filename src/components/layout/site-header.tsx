import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-shell site-nav">
        <Link className="brand" href="/" aria-label="Tada home"><Image src="/assets/logo.png" alt="Tada" width={154} height={72} priority /></Link>
        <form className="nav-search" role="search"><input aria-label="Search marketplace" placeholder="Search for items..." /></form>
        <nav className="nav-links" aria-label="Primary navigation"><Link className="nav-link" href="/market">Market</Link><Link className="nav-link" href="/jobs">Jobs</Link></nav>
        <div className="nav-actions"><Link className="button button-secondary" href="/sign-in">Sign-in</Link><Link className="button button-primary" href="/post-ad">Post Ad</Link></div>
      </div>
    </header>
  );
}
