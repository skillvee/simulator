"use client";

import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ErrorCaptureProvider } from "@/components/error-capture-provider";

// Sonner's <Toaster /> mounts a `<section>` on the client that wasn't in
// the SSR output, which trips React's hydration check (Recoverable
// Error: "Hydration failed..."). `next/dynamic({ ssr: false })` is not
// enough — the BailoutToCSR Suspense reason throws after React already
// flagged the diff. Defer mount with a useEffect flag so the slot stays
// empty through the hydration pass and the Toaster mounts on the next
// commit.
function HydrationSafeToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Toaster position="bottom-center" />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ErrorCaptureProvider>
        {children}
      </ErrorCaptureProvider>
      <HydrationSafeToaster />
    </SessionProvider>
  );
}
