import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/images/logo.png" alt="Tada" />
        <strong>The heartbeat of modern marketplace</strong>
        <p>Empowering local trade and discovery with high-speed digital tools for the modern era.</p>
      </div>

      <div className="footer-links">
        <div>
          <h2>Platform</h2>
          <Link href="/market">Categories</Link>
          <Link href="/market">How it Works</Link>
          <Link href="/market">Premium Listings</Link>
          <Link href="/market">Safety Tips</Link>
        </div>
        <div>
          <h2>Company</h2>
          <Link href="#">About Us</Link>
          <Link href="/jobs">Careers</Link>
          <Link href="#">Press Kit</Link>
          <Link href="#">Contact</Link>
        </div>
        <div>
          <h2>Download Our App</h2>
          <p>Get the fastest experience on your mobile device.</p>
          <Link className="store-button" href="#">
            App Store
          </Link>
          <Link className="store-button" href="#">
            Google Play
          </Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Tada. All rights reserved.</span>
        <nav aria-label="Legal links">
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
          <Link href="#">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}

