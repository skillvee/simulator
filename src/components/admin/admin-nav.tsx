import { checkIsAdmin } from "@/lib/core";
import Link from "next/link";

/**
 * Admin navigation link that only renders for admin users
 * Use this in page headers to conditionally show admin access
 */
export async function AdminNav() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="bg-foreground px-3 py-1 font-mono text-sm text-background hover:bg-secondary hover:text-secondary-foreground"
    >
      Admin
    </Link>
  );
}
