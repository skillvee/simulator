import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAssessmentForChat } from "@/server/queries/assessment";
import { WorkPageClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment";
import { isAssessmentHardExpired, getDeadlineAt } from "@/lib/core/assessment-timer";
import {
  phaseFromStatus,
  type PacingNudgeType,
} from "@/lib/core/assessment-phase";
import { isDemoUser } from "@/lib/core/env";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import type {
  ScenarioResource,
  ScenarioDoc,
  SimulationDepth,
} from "@/types";

interface WorkPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coworkerId?: string }>;
}

export default async function WorkPage({
  params,
  searchParams,
}: WorkPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const { coworkerId: selectedCoworkerId } = await searchParams;

  const assessment = await getAssessmentForChat(id, session.user.id);
  if (!assessment) {
    redirect("/candidate/dashboard");
  }

  // If no workingStartedAt, candidate hasn't clicked "Start Simulation" yet
  if (!assessment.workingStartedAt) {
    redirect(`/assessments/${id}/welcome`);
  }

  // If already completed, go to results
  if (assessment.status === AssessmentStatus.COMPLETED) {
    redirect(`/assessments/${id}/results`);
  }

  const simulationDepth = (assessment.scenario.simulationDepth || "medium") as SimulationDepth;

  // Safety-net auto-finalize: if the candidate is well past the cap (cap + 30
  // min grace) and STILL not on a walkthrough call, force-finalize. The cap
  // itself no longer auto-finalizes — the pacing-cap nudge handles that
  // moment with a manager message instead, so candidates running over by a
  // few minutes can still wrap up gracefully.
  if (
    isAssessmentHardExpired(assessment.workingStartedAt, simulationDepth) &&
    assessment.status !== AssessmentStatus.WALKTHROUGH_CALL
  ) {
    await db.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    redirect(`/assessments/${id}/results`);
  }

  const deadlineAt = getDeadlineAt(assessment.workingStartedAt, simulationDepth).toISOString();

  const coworkers = assessment.scenario.coworkers.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    avatarUrl: c.avatarUrl,
    gender: c.gender,
    ethnicity: c.ethnicity,
  }));

  // Default to the manager so the candidate lands on their chat
  // (the manager auto-starts the conversation with a welcome message)
  const manager = coworkers.find((c) =>
    c.role.toLowerCase().includes("manager")
  );
  const defaultCoworkerId = manager?.id || coworkers[0]?.id || null;

  const v1Resources =
    (assessment.scenario.resources as unknown as ScenarioResource[]) || [];

  // For v2 scenarios, synthesize ScenarioResource entries from the new fields
  // so the existing SlackLayout sidebar renders without changes:
  //   - each ScenarioDoc → type "document"
  //   - each ScenarioDataFile → type "spreadsheet" with download URL + preview
  //   - scenario.repoUrl → type "repository"
  const v2Resources: ScenarioResource[] = [];
  if (assessment.scenario.pipelineVersion === "v2") {
    const docs =
      (assessment.scenario.docs as unknown as ScenarioDoc[] | null) ?? [];
    for (const doc of docs) {
      v2Resources.push({
        type: "document",
        label: doc.name,
        content: doc.markdown,
      });
    }
    for (const file of assessment.scenario.dataFiles ?? []) {
      const previewRows =
        (file.previewRows as Record<string, unknown>[] | null) ?? [];
      const columns =
        (file.schemaJson as {
          columns?: Array<{ name: string; type: string }>;
        } | null)?.columns ?? [];
      const previewMarkdown = renderCsvPreviewMarkdown(
        file.filename,
        file.rowCount,
        columns,
        previewRows
      );
      v2Resources.push({
        type: "spreadsheet",
        label: file.filename,
        url: `/api/assessment/${id}/data-file/${file.id}`,
        instructions: "Click the link above to download the full CSV.",
        content: previewMarkdown,
      });
    }
    if (assessment.scenario.repoUrl) {
      v2Resources.push({
        type: "repository",
        label: "GitHub Repository",
        url: assessment.scenario.repoUrl,
        instructions:
          "Clone the repo and check the README for setup instructions.",
      });
    }
  }

  const scenarioResources = v2Resources.length > 0 ? v2Resources : v1Resources;
  const language = assessment.scenario.language || undefined;

  // Surface the project brief as the first resource document so the candidate
  // can read it inline alongside the rest of the supporting materials. There
  // is no dedicated "review materials" view anymore — the brief is just one
  // more doc in the sidebar, the chat is always live.
  const briefResource: ScenarioResource = {
    type: "document",
    label: language === "es" ? "El brief" : "The brief",
    content: assessment.scenario.taskDescription,
  };
  const resources: ScenarioResource[] = [briefResource, ...scenarioResources];

  const bypassRecording = isDemoUser(session.user.id);

  const initialPhase = phaseFromStatus(assessment.status);
  const timing = {
    reviewStartedAt: assessment.reviewStartedAt
      ? assessment.reviewStartedAt.toISOString()
      : null,
    workingStartedAt: assessment.workingStartedAt
      ? assessment.workingStartedAt.toISOString()
      : null,
  };

  return (
    <AssessmentScreenWrapper assessmentId={id} bypassRecording={bypassRecording}>
      <WorkPageClient
        assessmentId={id}
        candidateName={session.user.name ?? null}
        coworkers={coworkers}
        selectedCoworkerId={selectedCoworkerId || defaultCoworkerId}
        deadlineAt={deadlineAt}
        resources={resources}
        language={language}
        initialPhase={initialPhase}
        timing={timing}
        simulationDepth={simulationDepth}
        pacingNudgesDelivered={assessment.pacingNudgesDelivered as PacingNudgeType[]}
      />
    </AssessmentScreenWrapper>
  );
}

function renderCsvPreviewMarkdown(
  filename: string,
  rowCount: number | null,
  columns: Array<{ name: string; type: string }>,
  previewRows: Record<string, unknown>[]
): string {
  const colNames = columns.length > 0
    ? columns.map((c) => c.name)
    : Object.keys(previewRows[0] ?? {});

  const header = `# ${filename}\n\n**${rowCount ?? "?"} rows** · **${colNames.length} columns**\n\nPreview of the first ${previewRows.length} rows. Use the download link in the sidebar to fetch the full CSV.\n\n`;

  if (colNames.length === 0 || previewRows.length === 0) {
    return header + "_(no preview rows available)_\n";
  }

  const headerRow = `| ${colNames.join(" | ")} |`;
  const sepRow = `| ${colNames.map(() => "---").join(" | ")} |`;
  const dataRows = previewRows
    .map(
      (row) =>
        `| ${colNames
          .map((n) => String(row[n] ?? "").replace(/\|/g, "\\|"))
          .join(" | ")} |`
    )
    .join("\n");

  const schemaSection = columns.length
    ? `\n\n## Schema\n\n${columns
        .map((c) => `- \`${c.name}\` (${c.type})`)
        .join("\n")}\n`
    : "";

  return `${header}${headerRow}\n${sepRow}\n${dataRows}\n${schemaSection}`;
}
