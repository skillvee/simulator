/**
 * Unit tests for the ResourcePipelineStatus team-members row (US-005).
 *
 * Coworker grounding (Step 5) refines persona knowledge against the
 * finalized bundle just before the scenario flips to "passed". The team-
 * members row in the resources panel reflects that:
 *   - pre-passed status (judging / grounding_coworkers / generating) →
 *     pending with a "refining knowledge" subtitle
 *   - passed → ready with a "{N} coworkers ready" subtitle
 *   - 0 coworkers → row is hidden
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResourcePipelineStatus } from "./resource-pipeline-status";
import type { ResourcePipelineMeta, ResourcePipelineStatus as Status } from "@/types";

// The component polls /api/recruiter/simulations/[id]/resource-pipeline on
// mount. Stub it so tests don't fire real fetches; the row's presence and
// copy depend only on `initialMeta.status` + `coworkerCount`.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { pipelineMeta: null, isPublished: false } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
  );
});

function metaWithStatus(status: Status): ResourcePipelineMeta {
  return {
    version: "v2",
    status,
    attempts: 1,
    startedAt: "2026-04-27T00:00:00.000Z",
  };
}

describe("ResourcePipelineStatus — Team members row (US-005)", () => {
  it("renders pending with 'refining knowledge' subtitle while judging", () => {
    render(
      <ResourcePipelineStatus
        scenarioId="scn_test"
        initialMeta={metaWithStatus("judging")}
        initialIsPublished={false}
        resourceType="repo"
        coworkerCount={3}
      />
    );

    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.getByText("3 coworkers — refining knowledge")).toBeInTheDocument();
  });

  it("renders pending while grounding_coworkers (the canonical 'Step 5 in flight' status)", () => {
    render(
      <ResourcePipelineStatus
        scenarioId="scn_test"
        initialMeta={metaWithStatus("grounding_coworkers")}
        initialIsPublished={false}
        resourceType="repo"
        coworkerCount={2}
      />
    );

    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.getByText("2 coworkers — refining knowledge")).toBeInTheDocument();
  });

  it("renders ready with 'coworkers ready' subtitle once status === passed", () => {
    render(
      <ResourcePipelineStatus
        scenarioId="scn_test"
        initialMeta={metaWithStatus("passed")}
        initialIsPublished={true}
        resourceType="repo"
        coworkerCount={3}
      />
    );

    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.getByText("3 coworkers ready")).toBeInTheDocument();
  });

  it("uses singular 'coworker' for count of 1", () => {
    render(
      <ResourcePipelineStatus
        scenarioId="scn_test"
        initialMeta={metaWithStatus("passed")}
        initialIsPublished={true}
        resourceType="repo"
        coworkerCount={1}
      />
    );

    expect(screen.getByText("1 coworker ready")).toBeInTheDocument();
  });

  it("hides the row entirely when coworkerCount is 0", () => {
    render(
      <ResourcePipelineStatus
        scenarioId="scn_test"
        initialMeta={metaWithStatus("passed")}
        initialIsPublished={true}
        resourceType="repo"
        coworkerCount={0}
      />
    );

    expect(screen.queryByText("Team members")).not.toBeInTheDocument();
  });
});
