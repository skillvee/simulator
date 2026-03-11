"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function RecruiterSignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Recruiters always redirect to recruiter dashboard
  const callbackUrl = "/recruiter/dashboard";

  const handleGoogleSignUp = () => {
    setIsLoading(true);
    setError("");

    // Store role in localStorage for Google OAuth callback
    localStorage.setItem("skillvee_signup_role", "recruiter");

    void signIn("google", { redirectTo: callbackUrl });
  };

  const handleCredentialsSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      // Register the user with RECRUITER role
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: `${firstName} ${lastName}`.trim() || undefined,
          role: "RECRUITER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      // Sign in after successful registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(
          "Account created but sign-in failed. Please sign in manually."
        );
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8 lg:p-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-8 inline-block">
            <Image
              src="/skillvee-logo.png"
              alt="SkillVee"
              width={160}
              height={42}
              className="mx-auto"
              priority
            />
          </Link>
          <h2 className="text-3xl font-bold text-slate-900">
            Create your recruiter account
          </h2>
          <p className="mt-2 text-slate-500">
            Start assessing candidates with AI-powered simulations
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 text-sm font-medium hover:bg-slate-50"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-slate-400">or</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCredentialsSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                First name
              </label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                disabled={isLoading}
                className="h-12 rounded-xl border-slate-200 focus:border-primary"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Last name
              </label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={isLoading}
                className="h-12 rounded-xl border-slate-200 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Work email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-200 focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-200 focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-200 focus:border-primary"
            />
          </div>

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-primary font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              "Creating account..."
            ) : (
              <>
                Create recruiter account
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        {/* Terms */}
        <p className="mt-4 text-center text-xs text-slate-400">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-400">
          Looking to take an assessment?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign up as a candidate
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignUpLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

export default function RecruiterSignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <RecruiterSignUpForm />
    </Suspense>
  );
}
