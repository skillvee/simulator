import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <main className="relative flex min-h-screen animate-page-enter items-center justify-center bg-background px-6 py-12 text-foreground">
      {/* Gradient blur decoration */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-destructive/5 blur-3xl"
        aria-hidden="true"
      />

      <Card className="relative z-10 w-full max-w-md shadow-md">
        <CardContent className="p-8 text-center">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="mb-6 block text-2xl font-semibold">
              Skillvee
            </Link>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl font-semibold text-destructive">
              Authentication Error
            </h1>
            <p className="mt-4 text-muted-foreground">
              Something went wrong during authentication. Please try again.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/sign-in">Try Again</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
