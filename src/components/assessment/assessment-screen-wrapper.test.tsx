import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AssessmentScreenWrapper } from "./assessment-screen-wrapper";

const lifecycle = vi.hoisted(() => ({
  mounts: 0,
  unmounts: 0,
  assessmentIds: [] as string[],
}));

vi.mock("@/contexts/screen-recording-context", async () => {
  const React = await import("react");

  return {
    ScreenRecordingProvider: ({
      children,
      assessmentId,
    }: {
      children: React.ReactNode;
      assessmentId: string;
    }) => {
      const mountedAssessmentId = React.useRef(assessmentId);

      React.useEffect(() => {
        lifecycle.mounts += 1;
        lifecycle.assessmentIds.push(mountedAssessmentId.current);

        return () => {
          lifecycle.unmounts += 1;
        };
      }, []);

      return React.createElement("div", { "data-testid": "provider" }, children);
    },
  };
});

vi.mock("./screen-recording-guard", async () => {
  const React = await import("react");

  return {
    ScreenRecordingGuard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock("./webcam-preview", async () => {
  const React = await import("react");

  return {
    WebcamPreview: () =>
      React.createElement("div", { "data-testid": "webcam-preview" }),
  };
});

describe("AssessmentScreenWrapper", () => {
  beforeEach(() => {
    lifecycle.mounts = 0;
    lifecycle.unmounts = 0;
    lifecycle.assessmentIds = [];
  });

  it("remounts the recording provider when the assessment changes", async () => {
    const { rerender } = render(
      <AssessmentScreenWrapper assessmentId="assessment-1">
        <div>Assessment Content</div>
      </AssessmentScreenWrapper>
    );

    await waitFor(() => {
      expect(lifecycle.mounts).toBe(1);
      expect(lifecycle.unmounts).toBe(0);
      expect(lifecycle.assessmentIds).toEqual(["assessment-1"]);
    });

    rerender(
      <AssessmentScreenWrapper assessmentId="assessment-2">
        <div>Assessment Content</div>
      </AssessmentScreenWrapper>
    );

    await waitFor(() => {
      expect(lifecycle.mounts).toBe(2);
      expect(lifecycle.unmounts).toBe(1);
      expect(lifecycle.assessmentIds).toEqual([
        "assessment-1",
        "assessment-2",
      ]);
    });
  });
});
