import { checkIsAdmin } from "@/lib/core";
import Link from "next/link";
import { Button } from "@/components/ui";

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
    <Button variant="ghost" size="sm" asChild>
      <Link href="/admin" className="font-medium text-primary">
        Admin
      </Link>
    </Button>
  );
}
