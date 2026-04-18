import { requireCandidate } from "@/lib/core";
import { CandidateSidebar } from "./components/sidebar";

export default async function CandidateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCandidate();

  return (
    <div className="flex h-screen bg-white">
      <CandidateSidebar user={{ name: user.name ?? null, email: user.email ?? null }} />
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
