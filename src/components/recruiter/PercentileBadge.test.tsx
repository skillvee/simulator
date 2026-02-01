/**
 * Unit tests for PercentileBadge component
 *
 * @since 2026-02-01
 * @see Issue #208: US-010
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PercentileBadge } from "./PercentileBadge";

// ============================================================================
// Display Format Tests
// ============================================================================

describe("PercentileBadge", () => {
  describe("display formats", () => {
    it('displays "Top 10%" for percentile >= 90', () => {
      render(<PercentileBadge percentile={92} />);
      expect(screen.getByText("Top 10%")).toBeInTheDocument();
    });

    it('displays "Top 10%" for percentile = 90', () => {
      render(<PercentileBadge percentile={90} />);
      expect(screen.getByText("Top 10%")).toBeInTheDocument();
    });

    it('displays "Top 25%" for percentile >= 75 and < 90', () => {
      render(<PercentileBadge percentile={80} />);
      expect(screen.getByText("Top 25%")).toBeInTheDocument();
    });

    it('displays "Top 25%" for percentile = 75', () => {
      render(<PercentileBadge percentile={75} />);
      expect(screen.getByText("Top 25%")).toBeInTheDocument();
    });

    it('displays "Top 50%" for percentile >= 50 and < 75', () => {
      render(<PercentileBadge percentile={60} />);
      expect(screen.getByText("Top 50%")).toBeInTheDocument();
    });

    it('displays "Top 50%" for percentile = 50', () => {
      render(<PercentileBadge percentile={50} />);
      expect(screen.getByText("Top 50%")).toBeInTheDocument();
    });

    it('displays "XX percentile" for percentile < 50', () => {
      render(<PercentileBadge percentile={35} />);
      expect(screen.getByText("35th percentile")).toBeInTheDocument();
    });

    it('displays "1st percentile" with correct ordinal', () => {
      render(<PercentileBadge percentile={1} />);
      expect(screen.getByText("1st percentile")).toBeInTheDocument();
    });

    it('displays "2nd percentile" with correct ordinal', () => {
      render(<PercentileBadge percentile={2} />);
      expect(screen.getByText("2nd percentile")).toBeInTheDocument();
    });

    it('displays "3rd percentile" with correct ordinal', () => {
      render(<PercentileBadge percentile={3} />);
      expect(screen.getByText("3rd percentile")).toBeInTheDocument();
    });

    it('displays "11th percentile" with correct ordinal (special case)', () => {
      render(<PercentileBadge percentile={11} />);
      expect(screen.getByText("11th percentile")).toBeInTheDocument();
    });

    it('displays "21st percentile" with correct ordinal', () => {
      render(<PercentileBadge percentile={21} />);
      expect(screen.getByText("21st percentile")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Styling Tests
  // ============================================================================

  describe("styling", () => {
    it("applies gold/premium styling for Top 10%", () => {
      render(<PercentileBadge percentile={95} />);
      const badge = screen.getByTestId("percentile-badge");
      // Should have amber/gold gradient styling
      expect(badge.className).toMatch(/amber|yellow|gold/);
    });

    it("applies green styling for Top 25%", () => {
      render(<PercentileBadge percentile={80} />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/green/);
    });

    it("applies blue styling for Top 50%", () => {
      render(<PercentileBadge percentile={60} />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/blue/);
    });

    it("applies neutral styling for below 50%", () => {
      render(<PercentileBadge percentile={30} />);
      const badge = screen.getByTestId("percentile-badge");
      // Should have neutral/stone/gray styling
      expect(badge.className).toMatch(/stone|gray|neutral|muted/);
    });
  });

  // ============================================================================
  // Size Variants Tests
  // ============================================================================

  describe("size variants", () => {
    it("renders sm size for inline text", () => {
      render(<PercentileBadge percentile={90} size="sm" />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/text-xs/);
    });

    it("renders md size as default badge", () => {
      render(<PercentileBadge percentile={90} size="md" />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/text-sm/);
    });

    it("renders lg size for prominent card elements", () => {
      render(<PercentileBadge percentile={90} size="lg" />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/text-base|text-lg/);
    });

    it("defaults to md size when size prop is not provided", () => {
      render(<PercentileBadge percentile={90} />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge.className).toMatch(/text-sm/);
    });
  });

  // ============================================================================
  // Tooltip Tests
  // ============================================================================

  describe("tooltip", () => {
    it('displays tooltip on hover explaining "Scored higher than XX% of all candidates"', async () => {
      const user = userEvent.setup();
      render(<PercentileBadge percentile={85} />);

      const badge = screen.getByTestId("percentile-badge");
      await user.hover(badge);

      // Tooltip should appear with the explanation
      // Radix renders the tooltip content in multiple places for accessibility
      const tooltipTexts = await screen.findAllByText(
        "Scored higher than 85% of all candidates"
      );
      expect(tooltipTexts.length).toBeGreaterThan(0);
    });

    it("shows correct percentage in tooltip for low percentiles", async () => {
      const user = userEvent.setup();
      render(<PercentileBadge percentile={30} />);

      const badge = screen.getByTestId("percentile-badge");
      await user.hover(badge);

      // Radix renders the tooltip content in multiple places for accessibility
      const tooltipTexts = await screen.findAllByText(
        "Scored higher than 30% of all candidates"
      );
      expect(tooltipTexts.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("edge cases", () => {
    it("handles percentile = 0", () => {
      render(<PercentileBadge percentile={0} />);
      expect(screen.getByText("0th percentile")).toBeInTheDocument();
    });

    it("handles percentile = 100", () => {
      render(<PercentileBadge percentile={100} />);
      expect(screen.getByText("Top 10%")).toBeInTheDocument();
    });

    it("handles percentile = 49 (just below 50)", () => {
      render(<PercentileBadge percentile={49} />);
      expect(screen.getByText("49th percentile")).toBeInTheDocument();
    });

    it("handles percentile = 74 (just below 75)", () => {
      render(<PercentileBadge percentile={74} />);
      expect(screen.getByText("Top 50%")).toBeInTheDocument();
    });

    it("handles percentile = 89 (just below 90)", () => {
      render(<PercentileBadge percentile={89} />);
      expect(screen.getByText("Top 25%")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe("accessibility", () => {
    it("has appropriate aria-label for screen readers", () => {
      render(<PercentileBadge percentile={85} />);
      const badge = screen.getByTestId("percentile-badge");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Scored higher than 85% of all candidates"
      );
    });
  });
});

// ============================================================================
// Acceptance Criteria Tests
// ============================================================================

describe("Issue #208 Acceptance Criteria", () => {
  it("AC1: Component exists at src/components/recruiter/PercentileBadge.tsx", () => {
    // This test passes if the import works
    expect(PercentileBadge).toBeDefined();
  });

  it("AC2: Props include percentile (number) and optional size", () => {
    // TypeScript ensures this at compile time, but we verify runtime behavior
    render(<PercentileBadge percentile={85} />);
    expect(screen.getByTestId("percentile-badge")).toBeInTheDocument();

    render(<PercentileBadge percentile={85} size="sm" />);
    render(<PercentileBadge percentile={85} size="md" />);
    render(<PercentileBadge percentile={85} size="lg" />);
  });

  it('AC3a: Top 10% shows "Top 10%" with gold/premium styling', () => {
    render(<PercentileBadge percentile={95} />);
    expect(screen.getByText("Top 10%")).toBeInTheDocument();
    const badge = screen.getByTestId("percentile-badge");
    expect(badge.className).toMatch(/amber|yellow|gold/);
  });

  it('AC3b: Top 25% shows "Top 25%" with green styling', () => {
    render(<PercentileBadge percentile={80} />);
    expect(screen.getByText("Top 25%")).toBeInTheDocument();
    const badge = screen.getByTestId("percentile-badge");
    expect(badge.className).toMatch(/green/);
  });

  it('AC3c: Top 50% shows "Top 50%" with blue styling', () => {
    render(<PercentileBadge percentile={60} />);
    expect(screen.getByText("Top 50%")).toBeInTheDocument();
    const badge = screen.getByTestId("percentile-badge");
    expect(badge.className).toMatch(/blue/);
  });

  it('AC3d: Below 50% shows "XX percentile" with neutral styling', () => {
    render(<PercentileBadge percentile={35} />);
    expect(screen.getByText("35th percentile")).toBeInTheDocument();
    const badge = screen.getByTestId("percentile-badge");
    expect(badge.className).toMatch(/stone|gray|neutral|muted/);
  });

  it('AC4: Tooltip on hover explains "Scored higher than XX% of all candidates"', async () => {
    const user = userEvent.setup();
    render(<PercentileBadge percentile={85} />);

    await user.hover(screen.getByTestId("percentile-badge"));

    // Radix renders the tooltip content in multiple places for accessibility
    const tooltipTexts = await screen.findAllByText(
      "Scored higher than 85% of all candidates"
    );
    expect(tooltipTexts.length).toBeGreaterThan(0);
  });

  it("AC5: Size variants work correctly (sm=inline, md=badge, lg=prominent)", () => {
    const { rerender } = render(<PercentileBadge percentile={90} size="sm" />);
    expect(screen.getByTestId("percentile-badge").className).toMatch(/text-xs/);

    rerender(<PercentileBadge percentile={90} size="md" />);
    expect(screen.getByTestId("percentile-badge").className).toMatch(/text-sm/);

    rerender(<PercentileBadge percentile={90} size="lg" />);
    expect(screen.getByTestId("percentile-badge").className).toMatch(
      /text-base|text-lg/
    );
  });
});
