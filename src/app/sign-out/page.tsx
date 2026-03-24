"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

/**
 * Custom sign-out page — immediately signs out and redirects to sign-in.
 * Used as a branded alternative if anyone lands on a sign-out URL directly.
 */
export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/sign-in" });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <p className="text-sm text-slate-400">Signing out...</p>
    </div>
  );
}
