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
    <div className="flex min-h-screen bg-stone-50">
      <RecruiterSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
