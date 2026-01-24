import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { AdminNav } from "@/components/admin";
import { AccountDeletionSection } from "./account-deletion-section";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/settings");
  }

  const user = session.user as ExtendedUser;

  const dbUser = await db.user.findUnique({
    where: { id: user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      dataDeleteRequestedAt: true,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold">
            Skillvee
          </Link>
          <nav className="flex items-center gap-4">
            <AdminNav />
            <Link
              href="/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Profile
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Settings Header */}
        <section className="mb-12">
          <h1 className="mb-2 text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </section>

        {/* Account Information */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Account Information</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border py-3">
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">
                      {dbUser.name || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-border py-3">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {dbUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(dbUser.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Privacy Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Privacy</h2>
          <Card>
            <CardContent className="p-0">
              <Link
                href="/privacy"
                className="group flex items-center justify-between p-6 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium group-hover:text-primary">
                    Privacy Policy
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Read how we handle your data
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Delete Account Section */}
        <AccountDeletionSection
          deletionRequestedAt={dbUser.dataDeleteRequestedAt}
        />
      </div>
    </main>
  );
}
