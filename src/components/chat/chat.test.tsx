/**
 * Chat Component Tests
 *
 * Tests the chat component with in-call indicator functionality.
 *
 * @since 2026-01-18
 * @see Issue #85: US-024
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Chat } from "./chat";

// Mock the API client - source imports from @/lib/api
vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ messages: [] }),
  ApiClientError: class ApiClientError extends Error {},
}));

// Mock the useManagerAutoStart hook - source imports from @/hooks
vi.mock("@/hooks", () => ({
  useManagerAutoStart: vi.fn(),
}));

// Mock the useCallContext hook
const mockActiveCall = { coworkerId: "", callType: "coworker" as const };
const mockStartCall = vi.fn();
vi.mock("./slack-layout", () => ({
  useCallContext: vi.fn(() => ({
    activeCall: mockActiveCall.coworkerId ? mockActiveCall : null,
    startCall: mockStartCall,
    endCall: vi.fn(),
  })),
}));

// ============================================================================
// Test Factories
// ============================================================================

function createMockCoworker(
  overrides?: Partial<{
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  }>
) {
  return {
    id: "coworker-1",
    name: "Alex Chen",
    role: "Engineering Manager",
    avatarUrl: null,
    ...overrides,
  };
}

// ============================================================================
// Chat Component Tests
// ============================================================================

describe("Chat", () => {
  const defaultProps = {
    assessmentId: "assessment-123",
    coworker: createMockCoworker(),
  };

  beforeEach(() => {
    // Reset mock state
    mockActiveCall.coworkerId = "";
    mockStartCall.mockClear();
  });

  describe("rendering", () => {
    it("renders coworker name in header", () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    });

    it("renders coworker role in header", () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    it("renders coworker avatar with initials fallback in empty state", async () => {
      render(<Chat {...defaultProps} />);

      // Wait for the async history load to complete (shows Loading... first)
      // then the empty state renders with a CoworkerAvatar.
      // In jsdom, AvatarImage doesn't fire load events so the
      // AvatarFallback renders instead, showing initials "AC"
      await waitFor(() => {
        expect(screen.getByText("AC")).toBeInTheDocument();
      });
    });
  });

  describe("in-call indicator", () => {
    it("shows Start Call button when not in a call", () => {
      mockActiveCall.coworkerId = "";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("Start Call")).toBeInTheDocument();
      expect(screen.queryByText("In Call")).not.toBeInTheDocument();
    });

    it("shows In Call badge when in a call with this coworker", () => {
      mockActiveCall.coworkerId = "coworker-1";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("In Call")).toBeInTheDocument();
      expect(screen.queryByText("Start Call")).not.toBeInTheDocument();
    });

    it("shows Start Call button when in a call with different coworker", () => {
      mockActiveCall.coworkerId = "coworker-other";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("Start Call")).toBeInTheDocument();
      expect(screen.queryByText("In Call")).not.toBeInTheDocument();
    });

    it("in-call indicator has green background styling", () => {
      mockActiveCall.coworkerId = "coworker-1";
      const { container } = render(<Chat {...defaultProps} />);

      const inCallBadge = container.querySelector(".bg-green-500");
      expect(inCallBadge).toBeInTheDocument();
    });
  });

  describe("message input", () => {
    it("renders message input with placeholder", () => {
      render(<Chat {...defaultProps} />);

      expect(
        screen.getByPlaceholderText("Type a message...")
      ).toBeInTheDocument();
    });

    it("renders send button", () => {
      const { container } = render(<Chat {...defaultProps} />);

      // The send button is an icon-only button (no accessible name).
      // It is disabled by default because the input is empty.
      const sendButton = container.querySelector(
        "button.rounded-full[disabled]"
      );
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe("PR submission", () => {
    it("does not show done button anymore (PR submitted via chat)", () => {
      render(<Chat {...defaultProps} />);

      // Done button was removed - PR is now submitted via chat message
      expect(
        screen.queryByRole("button", { name: /done/i })
      ).not.toBeInTheDocument();
    });
  });
});
