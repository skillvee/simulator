import { requireAdmin } from "@/lib/core";
import { AdminSidebar } from "./components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-admins to home page
  const user = await requireAdmin();

  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar user={{ name: user.name ?? null, email: user.email ?? null }} />
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
