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
import { render, screen, fireEvent } from "@testing-library/react";
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
    it("renders team directory header", () => {
      render(<CoworkerSidebar {...defaultProps} />);

      expect(screen.getByText("Team Directory")).toBeInTheDocument();
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

    it("displays correct online count in footer", () => {
      const coworkers = createMockCoworkers(2);
      render(<CoworkerSidebar {...defaultProps} coworkers={coworkers} />);

      expect(screen.getByText(/2 online/)).toBeInTheDocument();
    });

    it("displays total team count including decorative members", () => {
      const coworkers = createMockCoworkers(2);
      render(<CoworkerSidebar {...defaultProps} coworkers={coworkers} />);

      // Should show total count (including decorative members)
      expect(screen.getByText(/\d+ total/)).toBeInTheDocument();
    });
  });

  describe("avatar identicons", () => {
    it("shows DiceBear identicon for coworker", () => {
      const coworker = createMockCoworker({ name: "Alex Chen" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      const avatar = screen.getByAltText("Alex Chen's avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("api.dicebear.com")
      );
    });

    it("uses coworker name as seed for deterministic avatar", () => {
      const coworker = createMockCoworker({ name: "Jamie Rodriguez" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      const avatar = screen.getByAltText("Jamie Rodriguez's avatar");
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("seed=Jamie%20Rodriguez")
      );
    });

    it("uses yellow background color for neo-brutalist theme", () => {
      const coworker = createMockCoworker({ name: "Test User" });
      render(<CoworkerSidebar {...defaultProps} coworkers={[coworker]} />);

      const avatar = screen.getByAltText("Test User's avatar");
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("backgroundColor=D4AF37")
      );
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
    it("highlights selected coworker", () => {
      const coworkers = createMockCoworkers(2);
      const { container } = render(
        <CoworkerSidebar
          coworkers={coworkers}
          onSelectCoworker={vi.fn()}
          selectedCoworkerId="coworker-1"
        />
      );

      // Find the selected item by checking for bg-accent class
      const selectedItem = container.querySelector(".bg-accent");
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
      const selectedItems = container.querySelectorAll(".bg-accent");
      expect(selectedItems).toHaveLength(1);
    });
  });

  describe("decorative team members", () => {
    it("renders decorative team members as offline", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      // Check that some decorative members are shown (they have opacity-60)
      const offlineMembers = document.querySelectorAll(".opacity-60");
      expect(offlineMembers.length).toBeGreaterThan(0);
    });

    it("decorative members have unavailable title", () => {
      render(<CoworkerSidebar {...defaultProps} coworkers={[]} />);

      const unavailableElements = screen.getAllByTitle("Unavailable");
      expect(unavailableElements.length).toBeGreaterThan(0);
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
