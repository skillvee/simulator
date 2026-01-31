import { requireRecruiter } from "@/lib/core";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-recruiters to home page
  const user = await requireRecruiter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Recruiter Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/skillvee-logo.png"
                alt="SkillVee"
                width={120}
                height={32}
                priority
              />
            </Link>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 font-medium text-xs"
            >
              Recruiter
            </Badge>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/recruiter/dashboard"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/recruiter/scenarios"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Scenarios
            </Link>
            <Link
              href="/recruiter/candidates"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Candidates
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Exit
            </Link>
            <span className="text-xs text-gray-400">{user.email}</span>
          </nav>
        </div>
      </header>

      {/* Recruiter Content */}
      <main>{children}</main>
    </div>
  );
}
