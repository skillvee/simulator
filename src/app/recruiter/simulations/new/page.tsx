import { requireRecruiter } from "@/lib/core";
import { RecruiterScenarioBuilderClient } from "./client";

export default async function RecruiterScenarioBuilderPage() {
  // This ensures only recruiters (or admins) can access this page
  await requireRecruiter();

  return (
    <div className="flex h-full flex-col">
      <RecruiterScenarioBuilderClient />
    </div>
  );
}
