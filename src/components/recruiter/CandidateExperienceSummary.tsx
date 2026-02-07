/**
 * Candidate Experience Summary
 *
 * Displays a narrative summary of what candidates will experience
 * when they join the simulation, including a visual timeline of stages.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Code, Video, BarChart } from "lucide-react";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";

type CandidateExperienceSummaryProps = {
  roleName: string;
  companyName: string;
  coworkers: CoworkerBuilderData[];
  taskSummary: string;
};

export function CandidateExperienceSummary({
  roleName,
  companyName,
  coworkers,
  taskSummary,
}: CandidateExperienceSummaryProps) {
  // Find the manager (Engineering Manager or first coworker with "Manager" in role)
  const manager = coworkers.find(
    (c) =>
      c.role === "Engineering Manager" ||
      c.role.toLowerCase().includes("manager")
  ) || coworkers[0];

  // Get up to 3 coworkers to mention (prefer non-managers first)
  const teamMembers = coworkers
    .filter((c) => c !== manager)
    .slice(0, 3);

  // Fallback if no manager or team members
  const managerName = manager?.name || "their manager";
  const hasTeamMembers = teamMembers.length > 0;

  // Build team intro - returns React elements
  const renderTeamIntro = () => {
    if (!hasTeamMembers) {
      return "their team";
    }

    return teamMembers.map((c, idx) => {
      const isLast = idx === teamMembers.length - 1;
      const needsComma = !isLast && teamMembers.length > 2;
      const needsAnd = isLast && teamMembers.length > 1;

      return (
        <span key={c.name}>
          {needsAnd && "and "}
          <strong>{c.name}</strong> ({c.role})
          {needsComma && ", "}
        </span>
      );
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/5 p-6">
      <div className="space-y-6">
        {/* Narrative */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Candidate Experience</h2>
          <p className="text-base leading-relaxed text-foreground/90">
            When a candidate joins, they'll be onboarded as a{" "}
            <strong>{roleName}</strong> at <strong>{companyName}</strong>.
            They'll meet their team on Slack — {renderTeamIntro()}. Their manager{" "}
            <strong>{managerName}</strong> will kick off the project:{" "}
            {taskSummary}. They'll have ~90 minutes to complete the task, ask
            questions, and submit a pull request. Finally, they'll defend their
            work in a call with {managerName}.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Assessment Stages
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Stage 1: Welcome */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Welcome</p>
                <p className="text-xs text-muted-foreground">
                  Onboarding & intro
                </p>
              </div>
            </div>

            {/* Stage 2: Team Chat & Coding */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Team Chat & Coding</p>
                <p className="text-xs text-muted-foreground">~60-90 min</p>
              </div>
            </div>

            {/* Stage 3: PR Defense */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">PR Defense</p>
                <p className="text-xs text-muted-foreground">~15 min call</p>
              </div>
            </div>

            {/* Stage 4: Results */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BarChart className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Results</p>
                <p className="text-xs text-muted-foreground">
                  8-dimension score
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            This is what the candidate will see
          </Badge>
        </div>
      </div>
    </Card>
  );
}
