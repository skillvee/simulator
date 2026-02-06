import { requireRecruiter } from "@/lib/core";
import { RecruiterSidebar } from "./components/sidebar";

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-recruiters to home page
  const user = await requireRecruiter();

  return (
    <div className="flex h-screen bg-white">
      <RecruiterSidebar user={{ name: user.name ?? null, email: user.email ?? null }} />
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
