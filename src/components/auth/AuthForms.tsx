"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/auth";

function PasswordToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.7 12s3.4-5 9.3-5 9.3 5 9.3 5-3.4 5-9.3 5-9.3-5-9.3-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SocialActions({ mode }: { mode: "sign in" | "sign up" }) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setIsGoogleLoading(true);
    setSocialError(null);
    const result = await signInWithGoogle();

    if (result.error) {
      setSocialError(result.error);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="social-auth-block">
      <div className="social-actions" aria-label={`Social ${mode} options`}>
      <button className="social-button" type="button" onClick={continueWithGoogle} disabled={isGoogleLoading}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285f4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fbbc05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335" />
        </svg>
        {isGoogleLoading ? "Connecting..." : "Google"}
      </button>
      <button className="social-button" type="button" disabled title="Apple sign-in is not available yet">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.13 12.89c-.02-2.15 1.76-3.18 1.84-3.23-1.01-1.48-2.57-1.68-3.12-1.7-1.32-.13-2.6.78-3.27.78-.69 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.55 2.16-1.52 2.64-.39 6.52 1.07 8.65.73 1.04 1.58 2.2 2.7 2.16 1.09-.04 1.5-.69 2.81-.69 1.3 0 1.68.69 2.83.67 1.18-.02 1.92-1.05 2.62-2.1.84-1.2 1.17-2.38 1.19-2.44-.03-.01-2.27-.87-2.29-3.52zM15 6.56c.59-.73 1-1.72.88-2.72-.85.04-1.9.59-2.51 1.31-.55.64-1.03 1.67-.9 2.65.96.07 1.93-.49 2.53-1.24z" fill="currentColor" />
        </svg>
        Apple
      </button>
      </div>
      {socialError ? <p className="form-error social-error" role="alert">{socialError}</p> : null}
    </div>
  );
}

export function LoginForm({
  redirectTo = "/market",
  registered = false,
}: {
  redirectTo?: string;
  registered?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/market";
    router.replace(safeRedirect);
    router.refresh();
  };

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="login-title">
        <div className="auth-card">
          <header className="brand-area">
            <Link className="brand-logo" href="/" aria-label="Tada home">
              <img src="/images/logo.png" alt="Tada" />
            </Link>
            <h1 id="login-title">Welcome Back</h1>
            <p>Log in to your account to continue</p>
          </header>

          <SocialActions mode="sign in" />
          <div className="divider"><span>Or continue with email</span></div>

          <form className="login-form" onSubmit={submit}>
            {registered ? (
              <p className="form-success" role="status">
                Account created. Check your email and confirm your address before logging in.
              </p>
            ) : null}
            <div className="field-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <i className="fa-regular fa-envelope" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Tab" && !event.shiftKey) {
                      event.preventDefault();
                      passwordInputRef.current?.focus();
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <Link href="#">Forgot Password?</Link>
              </div>
              <div className="input-wrap">
                <i className="fa-solid fa-lock" aria-hidden="true" />
                <input ref={passwordInputRef} id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button className="icon-button" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>
                  <PasswordToggleIcon />
                </button>
              </div>
            </div>

            <label className="check-row">
              <input type="checkbox" name="remember" />
              <span>Remember me</span>
            </label>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? "Logging in..." : "Log In"}</button>
          </form>

          <div className="divider compact"><span>or</span></div>
          <button className="passkey-button" type="button"><i className="fa-solid fa-user-plus" aria-hidden="true" />Sign in with Passkey</button>
          <p className="signup-copy">Don&apos;t have an account? <Link href="/signup">Sign Up</Link></p>
        </div>
      </section>
    </main>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/login?registered=1");
    router.refresh();
  };

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="signup-title">
        <div className="auth-card signup-card">
          <header className="brand-area compact-brand">
            <Link className="brand-logo" href="/" aria-label="Tada home">
              <img src="/images/logo.png" alt="Tada" />
            </Link>
          </header>

          <div className="auth-intro">
            <h1 id="signup-title">Create Account</h1>
            <p>Join thousands of sellers and buyers today.</p>
          </div>

          <SocialActions mode="sign up" />
          <div className="divider"><span>Or continue with email</span></div>

          <form className="login-form signup-form" onSubmit={submit}>
            <div className="field-group">
              <label htmlFor="full-name">Full Name</label>
              <div className="input-wrap">
                <i className="fa-regular fa-user" aria-hidden="true" />
                <input id="full-name" name="full-name" type="text" placeholder="John Doe" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="signup-email">Email Address</label>
              <div className="input-wrap has-action">
                <i className="fa-regular fa-envelope" aria-hidden="true" />
                <input id="signup-email" name="email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <p className="field-hint">After signing up, check your email and click the confirmation link.</p>
            </div>

            <div className="field-group">
              <label htmlFor="signup-password">Password</label>
              <div className="input-wrap">
                <i className="fa-solid fa-lock" aria-hidden="true" />
                <input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button className="icon-button" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>
                  <PasswordToggleIcon />
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="input-wrap">
                <i className="fa-solid fa-lock" aria-hidden="true" />
                <input id="confirm-password" name="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                <button className="icon-button" type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((current) => !current)}>
                  <PasswordToggleIcon />
                </button>
              </div>
            </div>

            <label className="terms-row">
              <input type="checkbox" name="terms" required />
              <span>I agree to the <Link href="#">Terms of Service</Link> and <Link href="#">Privacy Policy</Link>.</span>
            </label>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary-button signup-submit" type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create My Account"}</button>
          </form>

          <p className="signup-copy signin-copy">Already have an account? <Link href="/login">Sign In</Link></p>
        </div>

        <footer className="auth-footer-links" aria-label="Helpful links">
          <Link href="#">About Us</Link>
          <Link href="#">Safety Tips</Link>
          <Link href="#">Support</Link>
          <Link href="#">Press</Link>
        </footer>
      </section>
    </main>
  );
}
