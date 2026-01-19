/**
 * Unit tests for RejectionFeedbackModal component
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RejectionFeedbackModal } from "./rejection-feedback-modal";

// ============================================================================
// Test Setup
// ============================================================================

const mockOnClose = vi.fn();
const mockOnSubmit = vi.fn();

function renderModal(
  props: Partial<Parameters<typeof RejectionFeedbackModal>[0]> = {}
) {
  return render(
    <RejectionFeedbackModal
      isOpen={true}
      candidateName="Jane Doe"
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      {...props}
    />
  );
}

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe("RejectionFeedbackModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders modal when isOpen is true", () => {
      renderModal({ isOpen: true });
      expect(
        screen.getByTestId("rejection-feedback-modal")
      ).toBeInTheDocument();
    });

    it("does not render modal when isOpen is false", () => {
      renderModal({ isOpen: false });
      expect(
        screen.queryByTestId("rejection-feedback-modal")
      ).not.toBeInTheDocument();
    });

    it("displays candidate name in the modal title", () => {
      renderModal({ candidateName: "John Smith" });
      expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    });

    it('displays "Why isn\'t this candidate a fit?" prompt', () => {
      renderModal();
      expect(
        screen.getByText(/Why isn't this candidate a fit?/)
      ).toBeInTheDocument();
    });

    it("renders a text input for feedback", () => {
      renderModal();
      expect(screen.getByTestId("feedback-input")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      renderModal();
      expect(screen.getByTestId("submit-feedback-button")).toBeInTheDocument();
    });

    it("renders close/cancel button", () => {
      renderModal();
      expect(screen.getByTestId("close-modal-button")).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("accepts free-form text input", async () => {
      const user = userEvent.setup();
      renderModal();

      const input = screen.getByTestId("feedback-input");
      await user.type(input, "Need 8+ years, not 5");

      expect(input).toHaveValue("Need 8+ years, not 5");
    });

    it("shows placeholder text with examples", () => {
      renderModal();
      const input = screen.getByTestId("feedback-input");

      expect(input).toHaveAttribute(
        "placeholder",
        expect.stringMatching(/example|years|experience/i)
      );
    });
  });

  describe("submission", () => {
    it("calls onSubmit with feedback text when submitted", async () => {
      const user = userEvent.setup();
      renderModal();

      const input = screen.getByTestId("feedback-input");
      await user.type(input, "Looking for more frontend focus");

      const submitButton = screen.getByTestId("submit-feedback-button");
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        "Looking for more frontend focus"
      );
    });

    it("disables submit button when input is empty", () => {
      renderModal();
      const submitButton = screen.getByTestId("submit-feedback-button");

      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when input has text", async () => {
      const user = userEvent.setup();
      renderModal();

      const input = screen.getByTestId("feedback-input");
      await user.type(input, "Some feedback");

      const submitButton = screen.getByTestId("submit-feedback-button");
      expect(submitButton).not.toBeDisabled();
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      // Mock a slow submission
      const slowSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      renderModal({ onSubmit: slowSubmit });

      const input = screen.getByTestId("feedback-input");
      await user.type(input, "Feedback text");

      const submitButton = screen.getByTestId("submit-feedback-button");
      await user.click(submitButton);

      expect(screen.getByTestId("submit-loading")).toBeInTheDocument();
    });

    it("clears input after successful submission", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderModal();

      const input = screen.getByTestId("feedback-input");
      await user.type(input, "Some feedback");
      await user.click(screen.getByTestId("submit-feedback-button"));

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("closing", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByTestId("close-modal-button"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when overlay is clicked", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByTestId("modal-overlay"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", () => {
      renderModal();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not close when clicking inside the modal content", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByTestId("modal-content"));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("neo-brutalist styling", () => {
    it("has no rounded corners (0px radius)", () => {
      renderModal();
      const modal = screen.getByTestId("modal-content");

      // Should not have rounded classes
      expect(modal.className).not.toMatch(/rounded/);
    });

    it("has sharp borders", () => {
      renderModal();
      const modal = screen.getByTestId("modal-content");

      expect(modal.className).toMatch(/border-2|border-\[/);
    });
  });
});

// ============================================================================
// Acceptance Criteria Tests
// ============================================================================

describe("Acceptance Criteria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2: Clicking reject opens a feedback modal asking "Why isn\'t this candidate a fit?"', () => {
    renderModal({ isOpen: true });

    expect(screen.getByTestId("rejection-feedback-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Why isn't this candidate a fit?/)
    ).toBeInTheDocument();
  });

  it("AC3: Feedback input accepts free-form text", async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByTestId("feedback-input");
    await user.type(input, "Need 8+ years, not 5");

    expect(input).toHaveValue("Need 8+ years, not 5");
  });

  it("AC3: Feedback input shows example placeholder", () => {
    renderModal();
    const input = screen.getByTestId("feedback-input");

    // Should show example like "Need 8+ years, not 5" or "Looking for more frontend focus"
    const placeholder = input.getAttribute("placeholder") || "";
    expect(placeholder.length).toBeGreaterThan(0);
  });
});
