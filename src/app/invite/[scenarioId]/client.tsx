"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Sparkles, Loader2 } from "lucide-react";

interface ScenarioData {
  id: string;
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
}

interface UserData {
  id: string;
  email?: string;
}

interface InvitePageClientProps {
  scenario: ScenarioData;
  user: UserData | null;
}

function InvitePageContent({ scenario, user }: InvitePageClientProps) {
  const router = useRouter();

  // Auth form state
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasStartedRedirect = useRef(false);

  // When user is authenticated, automatically create assessment and redirect
  useEffect(() => {
    if (!user || hasStartedRedirect.current) return;
    hasStartedRedirect.current = true;
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch("/api/assessment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: scenario.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to create assessment");
          setIsLoading(false);
          hasStartedRedirect.current = false;
          return;
        }

        router.push(`/assessments/${data.assessment.id}/welcome`);
      } catch (err) {
        console.error("[invite] Assessment create failed:", err);
        setError("An error occurred. Please try again.");
        setIsLoading(false);
        hasStartedRedirect.current = false;
      }
    })();
  }, [user, scenario.id, router]);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setError("");
    void signIn("google", { redirectTo: `/invite/${scenario.id}` });
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: `${firstName} ${lastName}`.trim() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Registration failed");
          setIsLoading(false);
          return;
        }

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

        setIsLoading(false);
        router.refresh();
      } catch {
        setError("An error occurred. Please try again.");
        setIsLoading(false);
      }
    } else {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        setIsLoading(false);
        router.refresh();
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#020617] font-sans text-white lg:flex-row">
      {/* Left Panel - Narrative */}
      <div className="relative flex min-h-[50vh] flex-col justify-between p-8 lg:min-h-screen lg:w-3/5 lg:p-24">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-[-20%] top-[-20%] h-full w-full rounded-full bg-primary/20 blur-[150px]"
        />

        <header className="relative z-10">
          <Image
            src="/skillvee-logo.png"
            alt="Skillvee"
            width={120}
            height={32}
            className="object-contain brightness-0 invert"
            style={{ height: "auto" }}
            priority
          />
        </header>

        <main className="relative z-10 py-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h1 className="text-5xl font-black leading-[0.85] tracking-tight text-white lg:text-[90px]">
              YOUR
              <br />
              NEXT ROLE.
            </h1>
            <p className="max-w-xl text-xl font-medium text-slate-400 lg:text-2xl">
              {scenario.companyName} is looking for someone to join their team.
              Experience a day in the role before you commit.
            </p>
            {scenario.taskDescription && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">
                  Your Task:
                </p>
                <p className="line-clamp-3 text-sm text-slate-400">
                  {scenario.taskDescription.slice(0, 200)}...
                </p>
              </div>
            )}
            {scenario.techStack && scenario.techStack.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {scenario.techStack.slice(0, 5).map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {tech}
                  </span>
                ))}
                {scenario.techStack.length > 5 && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                    +{scenario.techStack.length - 5} more
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </main>

        <footer className="relative z-10 flex items-center gap-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Bot className="h-4 w-4 text-primary" />
            AI Teammates
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Sparkles className="h-4 w-4 text-primary" />
            Use Any AI Tools
          </div>
        </footer>
      </div>

      {/* Right Panel - Auth */}
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-8 text-slate-900 lg:min-h-screen lg:w-2/5 lg:p-16">
        <div className="w-full max-w-sm space-y-10">
          {user ? (
            // Logged in - auto-redirecting to welcome
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                {error ? (
                  <>
                    <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                      Not you?{" "}
                      <Link
                        href="/api/auth/signout"
                        className="text-primary hover:underline"
                      >
                        Sign out
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-slate-500">
                      Setting up your simulation...
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            // Not logged in - show auth form
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                  Get Started
                </h3>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Google OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full border-slate-200 text-sm font-semibold hover:bg-slate-50"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                >
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
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 font-medium text-slate-400">
                      or {mode === "signup" ? "sign up" : "sign in"} with email
                    </span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleCredentialsAuth} className="space-y-4">
                  {mode === "signup" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        disabled={isLoading}
                        className="h-12 rounded-full border-transparent bg-slate-50 px-5 focus:border-primary focus:bg-white"
                      />
                      <Input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        disabled={isLoading}
                        className="h-12 rounded-full border-transparent bg-slate-50 px-5 focus:border-primary focus:bg-white"
                      />
                    </div>
                  )}

                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    disabled={isLoading}
                    className="h-12 rounded-full border-transparent bg-slate-50 px-5 focus:border-primary focus:bg-white"
                  />

                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup"
                        ? "Password (8+ characters)"
                        : "Password"
                    }
                    required
                    disabled={isLoading}
                    className="h-12 rounded-full border-transparent bg-slate-50 px-5 focus:border-primary focus:bg-white"
                  />

                  {mode === "signup" && (
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      disabled={isLoading}
                      className="h-12 rounded-full border-transparent bg-slate-50 px-5 focus:border-primary focus:bg-white"
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-14 w-full rounded-full bg-primary text-lg font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary/90"
                  >
                    {isLoading
                      ? mode === "signup"
                        ? "Creating account..."
                        : "Signing in..."
                      : mode === "signup"
                        ? "Create account"
                        : "Sign in"}
                  </Button>
                </form>

                {/* Consent text (signup only) */}
                {mode === "signup" && (
                  <p className="text-center text-xs text-slate-400">
                    By signing up, you agree to screen and webcam recording and
                    our{" "}
                    <Link
                      href="/terms"
                      className="text-primary hover:underline"
                    >
                      Terms
                    </Link>{" "}
                    &{" "}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                )}

                {/* Toggle mode */}
                <p className="text-center text-sm text-slate-500">
                  {mode === "signup"
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <button
                    onClick={() => {
                      setMode(mode === "signup" ? "signin" : "signup");
                      setError("");
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {mode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvitePageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

export function InvitePageClient(props: InvitePageClientProps) {
  return (
    <Suspense fallback={<InvitePageLoading />}>
      <InvitePageContent {...props} />
    </Suspense>
  );
}
