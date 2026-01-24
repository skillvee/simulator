import { requireAdmin } from "@/lib/core";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-admins to home page
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Admin Header */}
      <header className="border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold">
              Skillvee
            </Link>
            <Badge variant="default" className="bg-primary font-mono text-xs">
              ADMIN
            </Badge>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-sm transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/scenarios"
              className="text-sm transition-colors hover:text-primary"
            >
              Scenarios
            </Link>
            <Link
              href="/admin/assessments"
              className="text-sm transition-colors hover:text-primary"
            >
              Assessments
            </Link>
            <Link
              href="/admin/users"
              className="text-sm transition-colors hover:text-primary"
            >
              Users
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link
              href="/"
              className="text-sm transition-colors hover:text-primary"
            >
              Exit Admin
            </Link>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </nav>
        </div>
      </header>

      {/* Admin Content */}
      <main>{children}</main>
    </div>
  );
}
