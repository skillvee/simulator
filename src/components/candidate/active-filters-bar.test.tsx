/**
 * ActiveFiltersBar Component Tests
 *
 * @since 2026-01-17
 * @see Issue #76: US-012c
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ActiveFiltersBar,
  createFiltersFromIntent,
  removeFilterFromIntent,
  type ActiveFilter,
} from "./active-filters-bar";
import type { ExtractedIntent } from "@/lib/candidate";

// ============================================================================
// ActiveFiltersBar Component Tests
// ============================================================================

describe("ActiveFiltersBar", () => {
  const mockOnRemoveFilter = vi.fn();
  const mockOnClearAll = vi.fn();

  const sampleFilters: ActiveFilter[] = [
    {
      type: "job_title",
      label: "Role",
      value: "Software Engineer",
      isRefinedByFeedback: false,
    },
    {
      type: "location",
      label: "Location",
      value: "SF",
      isRefinedByFeedback: false,
    },
    {
      type: "skills",
      label: "Skills",
      value: "Python, LLMs",
      isRefinedByFeedback: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders nothing when no filters are active", () => {
      const { container } = render(
        <ActiveFiltersBar
          filters={[]}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders all filter chips when filters are provided", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByTestId("active-filters-bar")).toBeInTheDocument();
      const chips = screen.getAllByTestId("filter-chip");
      expect(chips).toHaveLength(3);
    });

    it("displays filter labels and values correctly", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText("Role:")).toBeInTheDocument();
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Location:")).toBeInTheDocument();
      expect(screen.getByText("SF")).toBeInTheDocument();
      expect(screen.getByText("Skills:")).toBeInTheDocument();
      expect(screen.getByText("Python, LLMs")).toBeInTheDocument();
    });

    it("renders Active Filters label", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText("Active Filters")).toBeInTheDocument();
    });
  });

  describe("Clear all filters", () => {
    it("shows Clear all filters link when multiple filters are active", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(
        screen.getByTestId("clear-all-filters-button")
      ).toBeInTheDocument();
      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });

    it("does not show Clear all filters link when only one filter is active", () => {
      render(
        <ActiveFiltersBar
          filters={[sampleFilters[0]]}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(
        screen.queryByTestId("clear-all-filters-button")
      ).not.toBeInTheDocument();
    });

    it("calls onClearAll when Clear all filters is clicked", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      fireEvent.click(screen.getByTestId("clear-all-filters-button"));
      expect(mockOnClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("filter removal", () => {
    it("shows remove button on each filter chip", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      const removeButtons = screen.getAllByTestId("remove-filter-button");
      expect(removeButtons).toHaveLength(3);
    });

    it("calls onRemoveFilter with correct filter when remove button is clicked", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      const removeButtons = screen.getAllByTestId("remove-filter-button");
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemoveFilter).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveFilter).toHaveBeenCalledWith(sampleFilters[0]);
    });

    it("has correct aria-label on remove buttons", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByLabelText("Remove Role filter")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Remove Location filter")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Remove Skills filter")).toBeInTheDocument();
    });
  });

  describe("Refined by feedback indicator", () => {
    const refinedFilters: ActiveFilter[] = [
      {
        type: "job_title",
        label: "Role",
        value: "Frontend Engineer",
        isRefinedByFeedback: false,
      },
      {
        type: "years_experience",
        label: "Experience",
        value: "8+ years",
        isRefinedByFeedback: true,
      },
      {
        type: "skills",
        label: "Skills",
        value: "React",
        isRefinedByFeedback: true,
      },
    ];

    it("shows Refined by feedback indicator when any filter was refined", () => {
      render(
        <ActiveFiltersBar
          filters={refinedFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(
        screen.getByTestId("refined-by-feedback-indicator")
      ).toBeInTheDocument();
      expect(screen.getByText("Refined by feedback")).toBeInTheDocument();
    });

    it("does not show Refined by feedback indicator when no filters were refined", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      expect(
        screen.queryByTestId("refined-by-feedback-indicator")
      ).not.toBeInTheDocument();
    });

    it("shows sparkle icon on refined filter chips", () => {
      render(
        <ActiveFiltersBar
          filters={refinedFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      const refinedIndicators = screen.getAllByTestId("refined-indicator");
      expect(refinedIndicators).toHaveLength(2); // 2 refined filters
    });

    it("applies purple styling to refined filter chips", () => {
      render(
        <ActiveFiltersBar
          filters={refinedFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
        />
      );

      const chips = screen.getAllByTestId("filter-chip");
      // First chip is not refined - should have gold styling
      expect(chips[0]).toHaveClass("bg-secondary");
      // Second chip is refined - should have purple border
      expect(chips[1]).toHaveClass("border-purple-500");
    });
  });

  describe("custom className", () => {
    it("applies custom className to container", () => {
      render(
        <ActiveFiltersBar
          filters={sampleFilters}
          onRemoveFilter={mockOnRemoveFilter}
          onClearAll={mockOnClearAll}
          className="custom-class"
        />
      );

      expect(screen.getByTestId("active-filters-bar")).toHaveClass(
        "custom-class"
      );
    });
  });
});

// ============================================================================
// createFiltersFromIntent Tests
// ============================================================================

describe("createFiltersFromIntent", () => {
  const baseIntent: ExtractedIntent = {
    job_title: null,
    location: null,
    years_experience: null,
    skills: [],
    industry: [],
    company_type: [],
  };

  it("returns empty array for empty intent", () => {
    const result = createFiltersFromIntent(baseIntent);
    expect(result).toEqual([]);
  });

  it("creates job_title filter from intent", () => {
    const intent = { ...baseIntent, job_title: "Software Engineer" };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "job_title",
      label: "Role",
      value: "Software Engineer",
      isRefinedByFeedback: false,
    });
  });

  it("creates archetype filter when archetype is provided", () => {
    const intent = { ...baseIntent, job_title: "Frontend Developer" };
    const result = createFiltersFromIntent(intent, "SENIOR_FRONTEND_ENGINEER");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "archetype",
      label: "Role",
      value: "Frontend Engineer",
      isRefinedByFeedback: false,
    });
  });

  it("creates location filter from intent", () => {
    const intent = { ...baseIntent, location: "San Francisco" };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "location",
      label: "Location",
      value: "San Francisco",
      isRefinedByFeedback: false,
    });
  });

  it("creates years_experience filter from intent", () => {
    const intent = { ...baseIntent, years_experience: 5 };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "years_experience",
      label: "Experience",
      value: "5+ years",
      isRefinedByFeedback: false,
    });
  });

  it("creates seniority filter when seniority is provided", () => {
    const intent = { ...baseIntent, years_experience: 6 };
    const result = createFiltersFromIntent(intent, null, "SENIOR");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "seniority",
      label: "Experience",
      value: "Senior (6+ yrs)",
      isRefinedByFeedback: false,
    });
  });

  it("creates skills filter from intent", () => {
    const intent = { ...baseIntent, skills: ["Python", "React"] };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "skills",
      label: "Skills",
      value: "Python, React",
      isRefinedByFeedback: false,
    });
  });

  it("creates industry filter from intent", () => {
    const intent = { ...baseIntent, industry: ["fintech", "healthcare"] };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "industry",
      label: "Industry",
      value: "fintech, healthcare",
      isRefinedByFeedback: false,
    });
  });

  it("creates company_type filter from intent", () => {
    const intent = { ...baseIntent, company_type: ["startup", "VC backed"] };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "company_type",
      label: "Company",
      value: "startup, VC backed",
      isRefinedByFeedback: false,
    });
  });

  it("creates multiple filters from complete intent", () => {
    const intent: ExtractedIntent = {
      job_title: "Backend Developer",
      location: "NYC",
      years_experience: 5,
      skills: ["Node", "Python"],
      industry: ["fintech"],
      company_type: ["startup"],
    };
    const result = createFiltersFromIntent(intent);

    expect(result).toHaveLength(6);
  });

  it("marks refined fields correctly", () => {
    const intent = { ...baseIntent, job_title: "Engineer", skills: ["Python"] };
    const refinedFields = new Set(["skills"]);
    const result = createFiltersFromIntent(intent, null, null, refinedFields);

    expect(result).toHaveLength(2);
    expect(result[0].isRefinedByFeedback).toBe(false); // job_title not refined
    expect(result[1].isRefinedByFeedback).toBe(true); // skills is refined
  });

  it("marks archetype as refined when job_title is refined", () => {
    const intent = { ...baseIntent, job_title: "Frontend Engineer" };
    const refinedFields = new Set(["job_title"]);
    const result = createFiltersFromIntent(
      intent,
      "SENIOR_FRONTEND_ENGINEER",
      null,
      refinedFields
    );

    expect(result[0].type).toBe("archetype");
    expect(result[0].isRefinedByFeedback).toBe(true);
  });

  it("marks seniority as refined when years_experience is refined", () => {
    const intent = { ...baseIntent, years_experience: 8 };
    const refinedFields = new Set(["years_experience"]);
    const result = createFiltersFromIntent(
      intent,
      null,
      "SENIOR",
      refinedFields
    );

    expect(result[0].type).toBe("seniority");
    expect(result[0].isRefinedByFeedback).toBe(true);
  });
});

// ============================================================================
// removeFilterFromIntent Tests
// ============================================================================

describe("removeFilterFromIntent", () => {
  const completeIntent: ExtractedIntent = {
    job_title: "Software Engineer",
    location: "NYC",
    years_experience: 5,
    skills: ["Python", "React"],
    industry: ["fintech"],
    company_type: ["startup"],
  };

  it("removes job_title when job_title filter is removed", () => {
    const filter: ActiveFilter = {
      type: "job_title",
      label: "Role",
      value: "Software Engineer",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.job_title).toBeNull();
    expect(result.location).toBe("NYC"); // other fields unchanged
  });

  it("removes job_title when archetype filter is removed", () => {
    const filter: ActiveFilter = {
      type: "archetype",
      label: "Role",
      value: "Frontend Engineer",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.job_title).toBeNull();
  });

  it("removes location when location filter is removed", () => {
    const filter: ActiveFilter = {
      type: "location",
      label: "Location",
      value: "NYC",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.location).toBeNull();
    expect(result.job_title).toBe("Software Engineer"); // other fields unchanged
  });

  it("removes years_experience when years_experience filter is removed", () => {
    const filter: ActiveFilter = {
      type: "years_experience",
      label: "Experience",
      value: "5+ years",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.years_experience).toBeNull();
  });

  it("removes years_experience when seniority filter is removed", () => {
    const filter: ActiveFilter = {
      type: "seniority",
      label: "Experience",
      value: "Senior",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.years_experience).toBeNull();
  });

  it("clears skills array when skills filter is removed", () => {
    const filter: ActiveFilter = {
      type: "skills",
      label: "Skills",
      value: "Python, React",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.skills).toEqual([]);
  });

  it("clears industry array when industry filter is removed", () => {
    const filter: ActiveFilter = {
      type: "industry",
      label: "Industry",
      value: "fintech",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.industry).toEqual([]);
  });

  it("clears company_type array when company_type filter is removed", () => {
    const filter: ActiveFilter = {
      type: "company_type",
      label: "Company",
      value: "startup",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result.company_type).toEqual([]);
  });

  it("does not modify the original intent object", () => {
    const filter: ActiveFilter = {
      type: "job_title",
      label: "Role",
      value: "Software Engineer",
    };
    const result = removeFilterFromIntent(completeIntent, filter);

    expect(result).not.toBe(completeIntent);
    expect(completeIntent.job_title).toBe("Software Engineer"); // original unchanged
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("ActiveFiltersBar integration", () => {
  it("handles complete filter workflow", () => {
    const mockOnRemoveFilter = vi.fn();
    const mockOnClearAll = vi.fn();

    // Create filters from a realistic intent
    const intent: ExtractedIntent = {
      job_title: "Frontend Developer",
      location: "SF",
      years_experience: 5,
      skills: ["React", "TypeScript"],
      industry: [],
      company_type: ["startup"],
    };

    const refinedFields = new Set(["years_experience"]);
    const filters = createFiltersFromIntent(
      intent,
      "SENIOR_FRONTEND_ENGINEER",
      "MID",
      refinedFields
    );

    // Render with the generated filters
    render(
      <ActiveFiltersBar
        filters={filters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // Verify filters are displayed (role, location, experience, skills, company type)
    expect(screen.getAllByTestId("filter-chip")).toHaveLength(5);

    // Verify refined indicator is shown
    expect(
      screen.getByTestId("refined-by-feedback-indicator")
    ).toBeInTheDocument();

    // Click clear all
    fireEvent.click(screen.getByTestId("clear-all-filters-button"));
    expect(mockOnClearAll).toHaveBeenCalled();
  });

  it("handles filter removal and updates", () => {
    const mockOnRemoveFilter = vi.fn();
    const mockOnClearAll = vi.fn();

    const filters: ActiveFilter[] = [
      {
        type: "location",
        label: "Location",
        value: "NYC",
        isRefinedByFeedback: false,
      },
      {
        type: "skills",
        label: "Skills",
        value: "Python",
        isRefinedByFeedback: true,
      },
    ];

    render(
      <ActiveFiltersBar
        filters={filters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // Remove the first filter
    const removeButtons = screen.getAllByTestId("remove-filter-button");
    fireEvent.click(removeButtons[0]);

    expect(mockOnRemoveFilter).toHaveBeenCalledWith(filters[0]);
  });
});
