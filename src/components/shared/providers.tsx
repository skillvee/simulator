"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ErrorCaptureProvider } from "@/components/error-capture-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ErrorCaptureProvider>
        {children}
      </ErrorCaptureProvider>
      <Toaster position="bottom-center" />
    </SessionProvider>
  );
}
