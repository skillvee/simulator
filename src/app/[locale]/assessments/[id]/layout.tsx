import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Layout for assessment pages that enforces scenario language.
 * Ensures the URL locale matches the scenario's configured language.
 *
 * This prevents language mixing when a scenario is designed for a specific language.
 * For example, a Spanish scenario should always be accessed via /es/assessments/[id]/*
 */
export default async function AssessmentLayout({
  children,
  params
}: LayoutProps) {
  const { locale, id } = await params;

  // Fetch the assessment's scenario to get its language
  const assessment = await db.assessment.findUnique({
    where: { id },
    select: {
      scenario: {
        select: {
          language: true,
        },
      },
    },
  });

  // If assessment doesn't exist, show 404
  if (!assessment) {
    notFound();
    return null; // This won't execute, but TypeScript needs it
  }

  // If URL locale doesn't match scenario language, redirect to correct locale
  const scenarioLanguage = assessment.scenario.language;
  if (locale !== scenarioLanguage) {
    // Build the redirect URL with the correct locale
    // This will redirect /en/assessments/[id]/[path] to /[scenarioLanguage]/assessments/[id]/[path]
    const pathSegments = [scenarioLanguage, 'assessments', id];
    redirect(`/${pathSegments.join('/')}`);
  }

  // Locale matches, render children
  return <>{children}</>;
}