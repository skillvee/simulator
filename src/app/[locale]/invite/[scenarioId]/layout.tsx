import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; scenarioId: string }>;
}

/**
 * Layout for invite pages that enforces scenario language.
 * Ensures the URL locale matches the scenario's configured language.
 *
 * This prevents language mixing when a scenario is designed for a specific language.
 * For example, a Spanish scenario should always be accessed via /es/invite/[scenarioId]
 */
export default async function InviteLayout({
  children,
  params
}: LayoutProps) {
  const { locale, scenarioId } = await params;

  // Fetch the scenario to get its language
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      language: true,
    },
  });

  // If scenario doesn't exist, show 404
  if (!scenario) {
    notFound();
    return null; // This won't execute, but TypeScript needs it
  }

  // If URL locale doesn't match scenario language, redirect to correct locale
  const scenarioLanguage = scenario.language;
  if (locale !== scenarioLanguage) {
    // Build the redirect URL with the correct locale
    // This will redirect /en/invite/[scenarioId] to /[scenarioLanguage]/invite/[scenarioId]
    const pathSegments = [scenarioLanguage, 'invite', scenarioId];
    redirect(`/${pathSegments.join('/')}`);
  }

  // Locale matches, render children
  return <>{children}</>;
}