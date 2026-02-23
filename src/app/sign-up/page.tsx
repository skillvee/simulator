"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get role from URL params (candidate or employer)
  const role = searchParams.get("role") as "candidate" | "employer" | null;

  // Determine callback URL based on role
  const getCallbackUrl = () => {
    if (role === "candidate") {
      return "/candidate/call"; // Candidates go to call/screening flow
    } else if (role === "employer") {
      return "/recruiter/assessments"; // Employers go to recruiter dashboard
    }
    return searchParams.get("callbackUrl") ?? "/";
  };

  const callbackUrl = getCallbackUrl();

  const handleGoogleSignUp = () => {
    setIsLoading(true);
    setError("");

    // Store role in localStorage for Google OAuth callback
    if (role) {
      localStorage.setItem("skillvee_signup_role", role);
    }

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
      // Register the user with role
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName || undefined,
          role: role === "employer" ? "RECRUITER" : "USER", // Map employer to RECRUITER, default to USER
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
        setError("Account created but sign-in failed. Please sign in manually.");
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
    <div className="min-h-screen flex items-center justify-center bg-white p-8 lg:p-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/skillvee-logo.png"
              alt="SkillVee"
              width={160}
              height={42}
              className="mx-auto"
              priority
            />
          </Link>
          <h2 className="text-3xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-2 text-slate-500">
            Start practicing interviews with AI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-sm font-medium rounded-xl border-slate-200 hover:bg-slate-50"
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
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
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
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-200 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
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
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all group"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : (
              <>
                Create account
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Terms */}
        <p className="mt-4 text-xs text-center text-slate-400">
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
            href={`/sign-in${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpForm />
    </Suspense>
  );
}
