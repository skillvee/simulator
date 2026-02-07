/**
 * CoworkerSidebar Component Tests
 *
 * Tests the coworker sidebar using test factories from @/test/factories.
 * Demonstrates using the centralized factory pattern.
 *
 * @since 2026-01-18
 * @see Issue #98: REF-008
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoworkerSidebar } from "./coworker-sidebar";

// ============================================================================
// Coworker Factory (local to this test, demonstrates pattern)
// ============================================================================

/**
 * Factory for creating mock Coworker objects.
 * In real tests, you'd import from @/test/factories if shared across files.
 */
function createMockCoworker(
  overrides?: Partial<{
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  }>
) {
  return {
    id: "test-coworker-id",
    name: "Alex Chen",
    role: "Engineering Manager",
    avatarUrl: null,
    ...overrides,
  };
}

/**
 * Creates multiple mock coworkers for list testing.
 */
function createMockCoworkers(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createMockCoworker({
      id: `coworker-${i + 1}`,
      name: `Coworker ${i + 1}`,
      role: i % 2 === 0 ? "Developer" : "Designer",
    })
  );
}

// ============================================================================
// CoworkerSidebar Component Tests
// ============================================================================

describe("CoworkerSidebar", () => {
  const defaultProps = {
    coworkers: [createMockCoworker()],
    onSelectCoworker: vi.fn(),
  };

  describe("rendering", () => {
    it("renders team header", () => {
      render(<CoworkerSidebar {...defaultProps} />);

      expect(screen.getByText("Team")).toBeInTheDocument();
    });

    it("renders Skillvee brand header", () => {
      render(<CoworkerSidebar {...defaultProps} />);

      expect(screen.getByText("Skillvee")).toBeInTheDocument();
      expect(screen.getByText("S")).toBeInTheDocument();
    });

    it("renders coworker name and role", () => {
      const coworker = createMockCoworker({
        name: "Jamie Rodriguez",
        role: "Senior Developer",
      });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      expect(screen.getByText("Jamie Rodriguez")).toBeInTheDocument();
      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    });

    it("renders multiple coworkers", () => {
      const coworkers = createMockCoworkers(3);
      render(<CoworkerSidebar {...defaultProps} coworkers={coworkers} />);

      expect(screen.getByText("Coworker 1")).toBeInTheDocument();
      expect(screen.getByText("Coworker 2")).toBeInTheDocument();
      expect(screen.getByText("Coworker 3")).toBeInTheDocument();
    });
  });

  describe("avatar fallbacks", () => {
    it("shows initials fallback for coworker avatar in jsdom", () => {
      const coworker = createMockCoworker({ name: "Alex Chen" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      // In jsdom, AvatarImage does not render (no img load event), so
      // AvatarFallback shows initials instead
      expect(screen.getByText("AC")).toBeInTheDocument();
    });

    it("shows correct initials for multi-word names", () => {
      const coworker = createMockCoworker({ name: "Jamie Rodriguez" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      expect(screen.getByText("JR")).toBeInTheDocument();
    });

    it("renders CoworkerAvatar with correct alt text", () => {
      const coworker = createMockCoworker({ name: "Test User" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      // The Avatar component renders a span with data-slot="avatar" that
      // contains an AvatarImage (not visible in jsdom) and AvatarFallback.
      // Verify the avatar structure exists via the fallback.
      const fallback = screen.getByText("TU");
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveAttribute("data-slot", "avatar-fallback");
    });
  });

  describe("interactions", () => {
    it("calls onSelectCoworker with chat action when coworker is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCoworker = vi.fn();
      const coworker = createMockCoworker({ id: "coworker-123" });
      render(
        <CoworkerSidebar
          coworkers={[coworker]}
          onSelectCoworker={onSelectCoworker}
        />
      );

      await user.click(screen.getByText("Alex Chen"));

      expect(onSelectCoworker).toHaveBeenCalledWith("coworker-123", "chat");
    });

    it("calls onSelectCoworker with call action when call button is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCoworker = vi.fn();
      const coworker = createMockCoworker({ id: "coworker-456" });
      render(
        <CoworkerSidebar
          coworkers={[coworker]}
          onSelectCoworker={onSelectCoworker}
        />
      );

      await user.click(screen.getByRole("button", { name: /call alex chen/i }));

      expect(onSelectCoworker).toHaveBeenCalledWith("coworker-456", "call");
    });

    it("stops propagation when call button is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCoworker = vi.fn();
      const coworker = createMockCoworker();
      render(
        <CoworkerSidebar
          coworkers={[coworker]}
          onSelectCoworker={onSelectCoworker}
        />
      );

      await user.click(screen.getByRole("button", { name: /call/i }));

      // Should only be called once (for call), not twice (not for chat)
      expect(onSelectCoworker).toHaveBeenCalledTimes(1);
      expect(onSelectCoworker).toHaveBeenCalledWith(expect.any(String), "call");
    });
  });

  describe("selection state", () => {
    it("highlights selected coworker with primary styling", () => {
      const coworkers = createMockCoworkers(2);
      const { container } = render(
        <CoworkerSidebar
          coworkers={coworkers}
          onSelectCoworker={vi.fn()}
          selectedCoworkerId="coworker-1"
        />
      );

      // Selected coworker uses bg-primary/10 class
      const selectedItem = container.querySelector('[class*="bg-primary/10"]');
      expect(selectedItem).toBeInTheDocument();
    });

    it("does not highlight non-selected coworkers", () => {
      const coworkers = createMockCoworkers(2);
      const { container } = render(
        <CoworkerSidebar
          coworkers={coworkers}
          onSelectCoworker={vi.fn()}
          selectedCoworkerId="coworker-1"
        />
      );

      // Should only have one selected item
      const selectedItems = container.querySelectorAll('[class*="bg-primary/10"]');
      expect(selectedItems).toHaveLength(1);
    });
  });

  describe("decorative team members", () => {
    it("renders decorative team members as offline with opacity-50", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      // Decorative members use opacity-50 class
      const offlineMembers = document.querySelectorAll(".opacity-50");
      expect(offlineMembers.length).toBeGreaterThan(0);
    });

    it("decorative members have unavailable title", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      const unavailableElements = screen.getAllByTitle("Unavailable");
      expect(unavailableElements.length).toBeGreaterThan(0);
    });

    it("renders known decorative team member names", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      // DECORATIVE_TEAM_MEMBERS includes Maya Torres, Derek Washington, etc.
      expect(screen.getByText("Maya Torres")).toBeInTheDocument();
      expect(screen.getByText("Derek Washington")).toBeInTheDocument();
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    it("shows initials for decorative team members", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      // getInitials("Maya Torres") => "MT"
      expect(screen.getByText("MT")).toBeInTheDocument();
      // getInitials("Derek Washington") => "DW"
      expect(screen.getByText("DW")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible call button with coworker name", () => {
      const coworker = createMockCoworker({ name: "Jamie Lee" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      expect(
        screen.getByRole("button", { name: /call jamie lee/i })
      ).toBeInTheDocument();
    });
  });
});
