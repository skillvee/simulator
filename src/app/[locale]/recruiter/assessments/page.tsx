import { requireRecruiter } from "@/lib/core";
import { AssessmentsListClient } from "./client";
import { getSimulationsWithStats } from "./_shared/data";

export type { TopCandidate, AssessmentCardData } from "./_shared/data";

export default async function RecruiterAssessmentsPage() {
  const user = await requireRecruiter();
  const simulations = await getSimulationsWithStats(user.id);

  return <AssessmentsListClient simulations={simulations} />;
}
