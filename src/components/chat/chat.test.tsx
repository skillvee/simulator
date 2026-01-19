/**
 * Chat Component Tests
 *
 * Tests the chat component with in-call indicator functionality.
 *
 * @since 2026-01-18
 * @see Issue #85: US-024
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chat } from "./chat";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  api: vi.fn().mockResolvedValue({ messages: [] }),
  ApiClientError: class ApiClientError extends Error {},
}));

// Mock the useCallContext hook
const mockActiveCall = { coworkerId: "", callType: "coworker" as const };
vi.mock("./slack-layout", () => ({
  useCallContext: vi.fn(() => ({
    activeCall: mockActiveCall.coworkerId ? mockActiveCall : null,
    startCall: vi.fn(),
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

    it("renders coworker avatar with DiceBear identicon", () => {
      render(<Chat {...defaultProps} />);

      // Should show DiceBear identicon image
      const avatar = screen.getByAltText("Alex Chen's avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("api.dicebear.com")
      );
    });
  });

  describe("in-call indicator", () => {
    it("shows online indicator when not in a call", () => {
      mockActiveCall.coworkerId = "";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("online")).toBeInTheDocument();
      expect(screen.queryByText("In call")).not.toBeInTheDocument();
    });

    it("shows in-call indicator when in a call with this coworker", () => {
      mockActiveCall.coworkerId = "coworker-1";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("In call")).toBeInTheDocument();
      expect(screen.queryByText("online")).not.toBeInTheDocument();
    });

    it("shows online indicator when in a call with different coworker", () => {
      mockActiveCall.coworkerId = "coworker-other";
      render(<Chat {...defaultProps} />);

      expect(screen.getByText("online")).toBeInTheDocument();
      expect(screen.queryByText("In call")).not.toBeInTheDocument();
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
        screen.getByPlaceholderText("Message Alex Chen...")
      ).toBeInTheDocument();
    });

    it("renders send button", () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
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
