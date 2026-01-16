"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function GeometricDecoration() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Triangle - top right */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 bg-secondary"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />
      {/* Small triangle - bottom left */}
      <div
        className="absolute -bottom-8 -left-8 w-32 h-32 bg-foreground"
        style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
      />
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/start");
      } else {
        // Registration succeeded but sign-in failed, redirect to sign-in page
        router.push("/sign-in");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    signIn("google", { callbackUrl: "/start" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-md">
        <GeometricDecoration />

        <div className="relative z-10 border-2 border-border bg-background p-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="font-bold text-2xl block mb-6">
              Skillvee
            </Link>
            <h1 className="text-3xl font-bold">Create account</h1>
            <p className="text-muted-foreground mt-2">
              Start practicing real developer scenarios
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 border-2 border-destructive bg-destructive/10 text-destructive font-mono text-sm">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignUp}
            className="w-full bg-background text-foreground px-4 py-4 font-semibold border-2 border-foreground hover:bg-secondary hover:border-secondary flex items-center justify-center gap-3 mb-6"
            type="button"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-background font-mono text-sm text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block font-mono text-sm mb-2 text-muted-foreground"
              >
                NAME <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full px-4 py-3 bg-background border-2 border-border focus:border-secondary focus:outline-none font-mono"
                placeholder="Your name"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="email"
                className="block font-mono text-sm mb-2 text-muted-foreground"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-background border-2 border-border focus:border-secondary focus:outline-none font-mono"
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block font-mono text-sm mb-2 text-muted-foreground"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-background border-2 border-border focus:border-secondary focus:outline-none font-mono"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-sm mb-2 text-muted-foreground"
              >
                CONFIRM PASSWORD
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-background border-2 border-border focus:border-secondary focus:outline-none font-mono"
                placeholder="Re-enter password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-foreground text-background px-4 py-4 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Sign in link */}
          <p className="mt-6 text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-foreground font-semibold border-b-2 border-secondary hover:text-secondary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
