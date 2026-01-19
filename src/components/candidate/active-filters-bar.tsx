/**
 * Active Filters Bar Component
 *
 * Displays current search filters as removable chips/tags above results.
 * Features:
 * - Removable filter chips with "x" button
 * - "Clear all filters" link when multiple filters are active
 * - "Refined by feedback" indicator for feedback-updated filters
 *
 * @since 2026-01-17
 * @see Issue #76: US-012c
 */

import {
  X,
  Briefcase,
  MapPin,
  Clock,
  Cpu,
  Factory,
  Building2,
  Sparkles,
} from "lucide-react";
import type { ExtractedIntent } from "@/lib/candidate";

// ============================================================================
// Types
// ============================================================================

/**
 * Individual filter with value and metadata
 */
export interface ActiveFilter {
  /** Filter type matching entity extraction categories */
  type: keyof ExtractedIntent | "archetype" | "seniority";
  /** Human-readable label for display */
  label: string;
  /** Filter value to display */
  value: string;
  /** Whether this filter was added/modified via rejection feedback */
  isRefinedByFeedback?: boolean;
}

/**
 * Props for ActiveFiltersBar component
 */
export interface ActiveFiltersBarProps {
  /** Array of active filters to display */
  filters: ActiveFilter[];
  /** Callback when a filter is removed */
  onRemoveFilter: (filter: ActiveFilter) => void;
  /** Callback to clear all filters */
  onClearAll: () => void;
  /** Optional className for styling */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the icon for a filter type
 */
function getFilterIcon(type: ActiveFilter["type"]) {
  switch (type) {
    case "job_title":
    case "archetype":
      return <Briefcase size={14} />;
    case "location":
      return <MapPin size={14} />;
    case "years_experience":
    case "seniority":
      return <Clock size={14} />;
    case "skills":
      return <Cpu size={14} />;
    case "industry":
      return <Factory size={14} />;
    case "company_type":
      return <Building2 size={14} />;
    default:
      return null;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual filter chip with remove button
 */
function FilterChip({
  filter,
  onRemove,
}: {
  filter: ActiveFilter;
  onRemove: () => void;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 border-2 px-3 py-2 ${
        filter.isRefinedByFeedback
          ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
          : "border-foreground bg-secondary"
      } `}
      data-testid="filter-chip"
      data-filter-type={filter.type}
    >
      {/* Icon */}
      <span
        className={
          filter.isRefinedByFeedback
            ? "text-purple-700 dark:text-purple-300"
            : "text-secondary-foreground"
        }
      >
        {getFilterIcon(filter.type)}
      </span>

      {/* Label and Value */}
      <span className="flex items-center gap-1">
        <span
          className={`font-mono text-xs uppercase tracking-wider ${
            filter.isRefinedByFeedback
              ? "text-purple-600 dark:text-purple-400"
              : "text-secondary-foreground/70"
          }`}
        >
          {filter.label}:
        </span>
        <span
          className={`text-sm font-medium ${
            filter.isRefinedByFeedback
              ? "text-purple-900 dark:text-purple-100"
              : "text-secondary-foreground"
          }`}
        >
          {filter.value}
        </span>
      </span>

      {/* Refined by feedback indicator */}
      {filter.isRefinedByFeedback && (
        <Sparkles
          size={12}
          className="text-purple-500"
          data-testid="refined-indicator"
        />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className={`hover:bg-foreground/10 p-0.5 transition-colors ${
          filter.isRefinedByFeedback
            ? "text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100"
            : "text-secondary-foreground hover:text-foreground"
        } `}
        aria-label={`Remove ${filter.label} filter`}
        data-testid="remove-filter-button"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Active Filters Bar Component
 *
 * Displays active search filters as removable chips above search results.
 * Shows a "Clear all" link when multiple filters are active.
 * Highlights filters that were refined by rejection feedback.
 */
export function ActiveFiltersBar({
  filters,
  onRemoveFilter,
  onClearAll,
  className = "",
}: ActiveFiltersBarProps) {
  // Don't render if no filters
  if (filters.length === 0) {
    return null;
  }

  const hasMultipleFilters = filters.length > 1;
  const hasRefinedFilters = filters.some((f) => f.isRefinedByFeedback);

  return (
    <div
      className={`bg-muted/10 border-2 border-foreground p-4 ${className}`}
      data-testid="active-filters-bar"
    >
      {/* Header row with label and clear all */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Active Filters
          </span>
          {hasRefinedFilters && (
            <span
              className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400"
              data-testid="refined-by-feedback-indicator"
            >
              <Sparkles size={12} />
              Refined by feedback
            </span>
          )}
        </div>

        {/* Clear all link */}
        {hasMultipleFilters && (
          <button
            onClick={onClearAll}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            data-testid="clear-all-filters-button"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div
        className="flex flex-wrap gap-2"
        data-testid="filter-chips-container"
      >
        {filters.map((filter, index) => (
          <FilterChip
            key={`${filter.type}-${filter.value}-${index}`}
            filter={filter}
            onRemove={() => onRemoveFilter(filter)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates ActiveFilter array from ExtractedIntent
 *
 * @param intent - Extracted intent from entity extraction
 * @param archetype - Optional archetype for display
 * @param seniority - Optional seniority level for display
 * @param refinedFields - Set of field names that were refined by feedback
 * @returns Array of ActiveFilter objects
 */
export function createFiltersFromIntent(
  intent: ExtractedIntent,
  archetype?: string | null,
  seniority?: string | null,
  refinedFields: Set<string> = new Set()
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  // Job title / Archetype
  if (archetype) {
    filters.push({
      type: "archetype",
      label: "Role",
      value: formatArchetype(archetype),
      isRefinedByFeedback:
        refinedFields.has("job_title") || refinedFields.has("archetype"),
    });
  } else if (intent.job_title) {
    filters.push({
      type: "job_title",
      label: "Role",
      value: intent.job_title,
      isRefinedByFeedback: refinedFields.has("job_title"),
    });
  }

  // Location
  if (intent.location) {
    filters.push({
      type: "location",
      label: "Location",
      value: intent.location,
      isRefinedByFeedback: refinedFields.has("location"),
    });
  }

  // Seniority / Years of experience
  if (seniority) {
    filters.push({
      type: "seniority",
      label: "Experience",
      value: formatSeniority(seniority),
      isRefinedByFeedback:
        refinedFields.has("years_experience") || refinedFields.has("seniority"),
    });
  } else if (intent.years_experience !== null) {
    filters.push({
      type: "years_experience",
      label: "Experience",
      value: `${intent.years_experience}+ years`,
      isRefinedByFeedback: refinedFields.has("years_experience"),
    });
  }

  // Skills (individual chips for each skill)
  if (intent.skills && intent.skills.length > 0) {
    filters.push({
      type: "skills",
      label: "Skills",
      value: intent.skills.join(", "),
      isRefinedByFeedback: refinedFields.has("skills"),
    });
  }

  // Industry
  if (intent.industry && intent.industry.length > 0) {
    filters.push({
      type: "industry",
      label: "Industry",
      value: intent.industry.join(", "),
      isRefinedByFeedback: refinedFields.has("industry"),
    });
  }

  // Company type
  if (intent.company_type && intent.company_type.length > 0) {
    filters.push({
      type: "company_type",
      label: "Company",
      value: intent.company_type.join(", "),
      isRefinedByFeedback: refinedFields.has("company_type"),
    });
  }

  return filters;
}

/**
 * Formats archetype enum to human-readable string
 */
function formatArchetype(archetype: string): string {
  const map: Record<string, string> = {
    SENIOR_FRONTEND_ENGINEER: "Frontend Engineer",
    SENIOR_BACKEND_ENGINEER: "Backend Engineer",
    FULLSTACK_ENGINEER: "Fullstack Engineer",
    ENGINEERING_MANAGER: "Engineering Manager",
    TECH_LEAD: "Tech Lead",
    DEVOPS_ENGINEER: "DevOps Engineer",
    DATA_ENGINEER: "Data Engineer",
    GENERAL_SOFTWARE_ENGINEER: "Software Engineer",
  };
  return map[archetype] || archetype;
}

/**
 * Formats seniority level to human-readable string
 */
function formatSeniority(seniority: string): string {
  const map: Record<string, string> = {
    JUNIOR: "Junior (0-2 yrs)",
    MID: "Mid-level (3-5 yrs)",
    SENIOR: "Senior (6+ yrs)",
  };
  return map[seniority] || seniority;
}

/**
 * Removes a filter from the current intent
 *
 * @param intent - Current extracted intent
 * @param filterToRemove - Filter to remove
 * @returns Updated intent with filter removed
 */
export function removeFilterFromIntent(
  intent: ExtractedIntent,
  filterToRemove: ActiveFilter
): ExtractedIntent {
  const updated = { ...intent };

  switch (filterToRemove.type) {
    case "job_title":
    case "archetype":
      updated.job_title = null;
      break;
    case "location":
      updated.location = null;
      break;
    case "years_experience":
    case "seniority":
      updated.years_experience = null;
      break;
    case "skills":
      updated.skills = [];
      break;
    case "industry":
      updated.industry = [];
      break;
    case "company_type":
      updated.company_type = [];
      break;
  }

  return updated;
}
