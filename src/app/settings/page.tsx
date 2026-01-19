import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { AdminNav } from "@/components/admin";
import { AccountDeletionSection } from "./account-deletion-section";

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
      <header className="border-b-2 border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Skillvee
          </Link>
          <nav className="flex items-center gap-4">
            <AdminNav />
            <Link
              href="/profile"
              className="font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
            <Link
              href="/"
              className="font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Settings Header */}
        <section className="mb-12">
          <h1 className="mb-2 text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </section>

        {/* Account Information */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Account Information</h2>
          <div className="border-2 border-border p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border py-3">
                <div>
                  <p className="font-semibold">Name</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {dbUser.name || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-border py-3">
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {dbUser.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">Member Since</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }).format(dbUser.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Privacy</h2>
          <div className="border-2 border-border p-6">
            <Link
              href="/privacy"
              className="group flex items-center justify-between py-3 hover:text-secondary"
            >
              <div>
                <p className="font-semibold group-hover:text-secondary">
                  Privacy Policy
                </p>
                <p className="font-mono text-sm text-muted-foreground">
                  Read how we handle your data
                </p>
              </div>
              <svg
                className="h-5 w-5 text-muted-foreground group-hover:text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="square" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Delete Account Section */}
        <AccountDeletionSection
          deletionRequestedAt={dbUser.dataDeleteRequestedAt}
        />
      </div>
    </main>
  );
}
