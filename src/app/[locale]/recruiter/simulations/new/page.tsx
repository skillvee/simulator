import { requireRecruiter } from "@/lib/core";
import { RecruiterScenarioBuilderClient } from "./client";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function RecruiterScenarioBuilderPage({ params }: PageProps) {
  // This ensures only recruiters (or admins) can access this page
  await requireRecruiter();

  const { locale } = await params;

  return (
    <div className="flex h-full flex-col">
      <RecruiterScenarioBuilderClient uiLocale={locale as "en" | "es"} />
    </div>
  );
}
