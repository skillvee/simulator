"use client";

/**
 * Candidate Search Client Component
 *
 * Implements a chat-centric search interface with:
 * - Natural language input
 * - Real-time entity extraction with visual feedback
 * - Context tags showing detected entities
 * - Search results with reject functionality
 * - Feedback-driven search refinement
 *
 * @since 2026-01-17
 * @see Issue #72: US-007
 * @see Issue #75: US-012b
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUp, Briefcase, MapPin, Clock, Cpu, Building2, Factory, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import type { ExtractedIntent } from "@/lib/entity-extraction";
import type { RoleArchetype } from "@/lib/archetype-weights";
import type { SeniorityLevel } from "@/lib/seniority-thresholds";
import { CandidateSearchResultGrid, type CandidateSearchResult } from "@/components/candidate-search-result-card";
import { RejectionFeedbackModal } from "@/components/rejection-feedback-modal";
import type { ConstraintUpdate } from "@/lib/feedback-parsing";
import { AssessmentDimension } from "@prisma/client";
import {
  ActiveFiltersBar,
  createFiltersFromIntent,
  removeFilterFromIntent,
  type ActiveFilter,
} from "@/components/active-filters-bar";

// ============================================================================
// Types
// ============================================================================

interface ExtractionResult {
  intent: ExtractedIntent;
  archetype: RoleArchetype | null;
  seniority: SeniorityLevel | null;
  processingTimeMs: number;
}

interface ContextTag {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  isActive: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// ============================================================================
// Constants
// ============================================================================

const EXAMPLE_QUERY =
  "Software Engineers in NYC with 3+ years of experience, skilled in React and Node, has experience with ML / LLMs and working at an early stage VC backed startup";

const DEBOUNCE_MS = 300;

/**
 * Sequential loading messages displayed during search
 * Each message is shown for a minimum duration before transitioning to the next
 */
const LOADING_MESSAGES = [
  "Processing your search criteria...",
  "Looking for profiles that match your criteria...",
] as const;

const LOADING_MESSAGE_DURATION_MS = 2000; // 2 seconds per message
const TOAST_DURATION_MS = 4000; // 4 seconds

// Mock data for demonstration
const MOCK_CANDIDATES: CandidateSearchResult[] = [
  {
    id: "va-1",
    candidate: { id: "c1", name: "Alex Chen", email: "alex@example.com" },
    fitScore: 92,
    archetype: "SENIOR_FRONTEND_ENGINEER",
    seniorityLevel: "SENIOR",
    dimensionScores: [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.COMMUNICATION, score: 5, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.COLLABORATION, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 4, weightLevel: "MEDIUM" },
      { dimension: AssessmentDimension.LEADERSHIP, score: 3, weightLevel: "MEDIUM" },
    ],
    summaryExcerpt: "Exceptional frontend developer with 8 years of React experience and strong communication skills.",
    completedAt: new Date("2026-01-10"),
  },
  {
    id: "va-2",
    candidate: { id: "c2", name: "Jordan Smith", email: "jordan@example.com" },
    fitScore: 78,
    archetype: "SENIOR_FRONTEND_ENGINEER",
    seniorityLevel: "MID",
    dimensionScores: [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.COMMUNICATION, score: 4, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.COLLABORATION, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 3, weightLevel: "MEDIUM" },
      { dimension: AssessmentDimension.LEADERSHIP, score: 3, weightLevel: "MEDIUM" },
    ],
    summaryExcerpt: "Solid frontend developer with 5 years of experience, strong in React and TypeScript.",
    completedAt: new Date("2026-01-12"),
  },
  {
    id: "va-3",
    candidate: { id: "c3", name: "Sam Rodriguez", email: "sam@example.com" },
    fitScore: 85,
    archetype: "FULLSTACK_ENGINEER",
    seniorityLevel: "SENIOR",
    dimensionScores: [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.COMMUNICATION, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.COLLABORATION, score: 4, weightLevel: "HIGH" },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 5, weightLevel: "VERY_HIGH" },
      { dimension: AssessmentDimension.LEADERSHIP, score: 4, weightLevel: "MEDIUM" },
    ],
    summaryExcerpt: "Versatile fullstack engineer with 7 years of experience, excellent problem-solving skills.",
    completedAt: new Date("2026-01-14"),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats seniority level for display
 */
function formatSeniority(seniority: SeniorityLevel | null): string | null {
  if (!seniority) return null;
  const map: Record<SeniorityLevel, string> = {
    JUNIOR: "Junior (0-2 yrs)",
    MID: "Mid-level (3-5 yrs)",
    SENIOR: "Senior (6+ yrs)",
  };
  return map[seniority] || seniority;
}

/**
 * Formats archetype for display
 */
function formatArchetype(archetype: RoleArchetype | null): string | null {
  if (!archetype) return null;
  const map: Record<RoleArchetype, string> = {
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

// ============================================================================
// Main Component
// ============================================================================

export function CandidateSearchClient() {
  // Search state
  const [query, setQuery] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Results state
  const [searchResults, setSearchResults] = useState<CandidateSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [rejectedCandidateIds, setRejectedCandidateIds] = useState<Set<string>>(new Set());

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    candidateName: string;
  }>({ isOpen: false, candidateId: null, candidateName: "" });

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Track which fields have been refined by feedback
  const [refinedFields, setRefinedFields] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cycle through loading messages during search
  useEffect(() => {
    if (isSearching) {
      // Reset to first message when search starts
      setLoadingMessageIndex(0);

      // Set up timer to advance through messages
      loadingTimerRef.current = setInterval(() => {
        setLoadingMessageIndex((prev) => {
          // Stop at the last message (don't cycle back)
          if (prev >= LOADING_MESSAGES.length - 1) {
            return prev;
          }
          return prev + 1;
        });
      }, LOADING_MESSAGE_DURATION_MS);
    } else {
      // Clear timer when search ends
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setLoadingMessageIndex(0);
    }

    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [isSearching]);

  // Auto-remove toasts after duration
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [toasts]);

  // Add a toast notification
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  // Debounced entity extraction
  const extractEntities = useCallback(async (text: string) => {
    if (!text.trim()) {
      setExtraction(null);
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch("/api/search/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });

      if (response.ok) {
        const data: ExtractionResult = await response.json();
        setExtraction(data);
      }
    } catch (error) {
      console.error("Entity extraction failed:", error);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  // Handle input change with debounced extraction
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer for entity extraction
    debounceRef.current = setTimeout(() => {
      extractEntities(value);
    }, DEBOUNCE_MS);
  };

  // Handle search submission
  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setRejectedCandidateIds(new Set()); // Reset rejected candidates on new search
    setRefinedFields(new Set()); // Reset refined fields on new search

    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Use mock data for now (filtered by rejected IDs)
    setSearchResults(MOCK_CANDIDATES);
    setHasSearched(true);
    setIsSearching(false);
  };

  // Handle Enter key to search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // Handle candidate rejection - open modal
  const handleRejectCandidate = useCallback((candidateId: string) => {
    const candidate = searchResults.find((c) => c.id === candidateId);
    if (!candidate) return;

    setRejectionModal({
      isOpen: true,
      candidateId,
      candidateName: candidate.candidate.name || candidate.candidate.email || "Anonymous",
    });
  }, [searchResults]);

  // Handle feedback submission from modal
  const handleFeedbackSubmit = async (feedback: string) => {
    if (!rejectionModal.candidateId) return;

    try {
      // Parse feedback to extract constraints
      const response = await fetch("/api/search/parse-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update the query with new constraints (for display purposes)
        if (result.constraints && result.constraints.length > 0) {
          // Track which fields were refined
          const newRefinedFields = new Set(refinedFields);
          result.constraints.forEach((c: ConstraintUpdate) => {
            newRefinedFields.add(c.type);
          });
          setRefinedFields(newRefinedFields);

          const constraintDescriptions = result.constraints
            .map((c: ConstraintUpdate) => {
              const value = Array.isArray(c.value) ? c.value.join(", ") : c.value;
              return `${c.type}: ${value}`;
            })
            .join("; ");

          // Append to current query
          const updatedQuery = `${query} [Refined: ${constraintDescriptions}]`;
          setQuery(updatedQuery);

          // Update the extraction with new constraints
          if (extraction) {
            const updatedIntent = { ...extraction.intent };
            for (const constraint of result.constraints) {
              switch (constraint.type) {
                case "years_experience":
                  const yearsMatch =
                    typeof constraint.value === "string"
                      ? constraint.value.match(/(\d+)/)
                      : null;
                  if (yearsMatch) {
                    updatedIntent.years_experience = parseInt(yearsMatch[1], 10);
                  }
                  break;
                case "skills":
                  const newSkills = Array.isArray(constraint.value)
                    ? constraint.value
                    : [constraint.value];
                  updatedIntent.skills = [...(updatedIntent.skills || []), ...newSkills];
                  break;
                case "job_title":
                  updatedIntent.job_title =
                    typeof constraint.value === "string" ? constraint.value : null;
                  break;
                case "location":
                  updatedIntent.location =
                    typeof constraint.value === "string" ? constraint.value : null;
                  break;
                case "industry":
                  const newIndustry = Array.isArray(constraint.value)
                    ? constraint.value
                    : [constraint.value];
                  updatedIntent.industry = [...(updatedIntent.industry || []), ...newIndustry];
                  break;
                case "company_type":
                  const newCompanyType = Array.isArray(constraint.value)
                    ? constraint.value
                    : [constraint.value];
                  updatedIntent.company_type = [
                    ...(updatedIntent.company_type || []),
                    ...newCompanyType,
                  ];
                  break;
              }
            }
            setExtraction({
              ...extraction,
              intent: updatedIntent,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse feedback:", error);
    }

    // Remove the rejected candidate from results
    setRejectedCandidateIds((prev) => new Set([...prev, rejectionModal.candidateId!]));

    // Close modal
    setRejectionModal({ isOpen: false, candidateId: null, candidateName: "" });

    // Show toast notification
    addToast("Search updated based on your feedback", "success");
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setHasSearched(false);
    setSearchResults([]);
    setRejectedCandidateIds(new Set());
    setRefinedFields(new Set());
  };

  // Handle removing a single filter
  const handleRemoveFilter = useCallback((filter: ActiveFilter) => {
    if (!extraction) return;

    // Update the extraction intent
    const updatedIntent = removeFilterFromIntent(extraction.intent, filter);

    // Clear archetype/seniority if the corresponding filter was removed
    let updatedArchetype = extraction.archetype;
    let updatedSeniority = extraction.seniority;

    if (filter.type === "job_title" || filter.type === "archetype") {
      updatedArchetype = null;
    }
    if (filter.type === "years_experience" || filter.type === "seniority") {
      updatedSeniority = null;
    }

    setExtraction({
      ...extraction,
      intent: updatedIntent,
      archetype: updatedArchetype,
      seniority: updatedSeniority,
    });

    // Remove from refined fields if it was marked as refined
    if (refinedFields.has(filter.type)) {
      const newRefinedFields = new Set(refinedFields);
      newRefinedFields.delete(filter.type);
      setRefinedFields(newRefinedFields);
    }

    // Show toast
    addToast(`Removed ${filter.label} filter`, "info");
  }, [extraction, refinedFields, addToast]);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    if (!extraction) return;

    // Reset all intent values
    setExtraction({
      ...extraction,
      intent: {
        job_title: null,
        location: null,
        years_experience: null,
        skills: [],
        industry: [],
        company_type: [],
      },
      archetype: null,
      seniority: null,
    });

    // Clear all refined fields
    setRefinedFields(new Set());

    // Show toast
    addToast("All filters cleared", "info");
  }, [extraction, addToast]);

  // Filter out rejected candidates
  const visibleResults = searchResults.filter(
    (candidate) => !rejectedCandidateIds.has(candidate.id)
  );

  // Build context tags from extraction
  const contextTags: ContextTag[] = [
    {
      label: "Job Title",
      value: extraction?.archetype
        ? formatArchetype(extraction.archetype)
        : extraction?.intent.job_title ?? null,
      icon: <Briefcase size={14} />,
      isActive: !!(extraction?.intent.job_title || extraction?.archetype),
    },
    {
      label: "Location",
      value: extraction?.intent.location ?? null,
      icon: <MapPin size={14} />,
      isActive: !!extraction?.intent.location,
    },
    {
      label: "Experience",
      value: extraction?.seniority
        ? formatSeniority(extraction.seniority)
        : extraction?.intent.years_experience
          ? `${extraction.intent.years_experience}+ years`
          : null,
      icon: <Clock size={14} />,
      isActive: !!(extraction?.intent.years_experience || extraction?.seniority),
    },
    {
      label: "Skills",
      value:
        extraction?.intent.skills && extraction.intent.skills.length > 0
          ? extraction.intent.skills.join(", ")
          : null,
      icon: <Cpu size={14} />,
      isActive: !!(extraction?.intent.skills && extraction.intent.skills.length > 0),
    },
    {
      label: "Industry",
      value:
        extraction?.intent.industry && extraction.intent.industry.length > 0
          ? extraction.intent.industry.join(", ")
          : null,
      icon: <Factory size={14} />,
      isActive: !!(extraction?.intent.industry && extraction.intent.industry.length > 0),
    },
    {
      label: "Company Type",
      value:
        extraction?.intent.company_type && extraction.intent.company_type.length > 0
          ? extraction.intent.company_type.join(", ")
          : null,
      icon: <Building2 size={14} />,
      isActive: !!(
        extraction?.intent.company_type && extraction.intent.company_type.length > 0
      ),
    },
  ];

  // Build active filters for the filter bar
  const activeFilters: ActiveFilter[] = extraction
    ? createFiltersFromIntent(
        extraction.intent,
        extraction.archetype,
        extraction.seniority,
        refinedFields
      )
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {hasSearched && (
              <button
                onClick={handleBackToSearch}
                className="p-2 border-2 border-foreground hover:bg-accent"
                aria-label="Back to search"
                data-testid="back-button"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-bold">Candidate Search</h1>
          </div>
          <span className="text-sm text-muted-foreground font-mono">BETA</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col px-6 py-8">
        {isSearching ? (
          /* Loading State */
          <div className="flex-1 flex items-center justify-center" data-testid="loading-state">
            <div className="w-full max-w-3xl">
              <div className="flex flex-col items-center justify-center py-16">
                {/* Animated loading indicator */}
                <div
                  className="relative w-16 h-16 mb-8"
                  data-testid="loading-indicator"
                >
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 border-4 border-muted animate-spin border-t-secondary" />
                  {/* Inner pulsing circle */}
                  <div className="absolute inset-3 bg-secondary animate-pulse" />
                </div>

                {/* Sequential loading messages */}
                <div className="text-center" data-testid="loading-messages">
                  <p
                    className="text-xl font-medium text-foreground mb-2 transition-opacity duration-300"
                    data-testid="current-loading-message"
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    Please wait while we search our database
                  </p>
                </div>

                {/* Progress dots showing message sequence */}
                <div
                  className="flex gap-2 mt-8"
                  data-testid="loading-progress-dots"
                >
                  {LOADING_MESSAGES.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 transition-colors ${
                        index <= loadingMessageIndex
                          ? "bg-secondary"
                          : "bg-muted"
                      }`}
                      data-testid={`progress-dot-${index}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : hasSearched ? (
          /* Search Results */
          <div className="w-full max-w-6xl mx-auto" data-testid="search-results">
            {/* Active filters bar - above results */}
            <ActiveFiltersBar
              filters={activeFilters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              className="mb-6"
            />

            {/* Results count */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                {visibleResults.length} candidate{visibleResults.length !== 1 ? "s" : ""} found
                {rejectedCandidateIds.size > 0 && (
                  <span className="ml-2 text-sm">
                    ({rejectedCandidateIds.size} rejected)
                  </span>
                )}
              </p>
            </div>

            {/* Results grid */}
            <CandidateSearchResultGrid
              candidates={visibleResults}
              onReject={handleRejectCandidate}
            />
          </div>
        ) : (
          /* Search Form */
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-3xl">
              {/* Greeting */}
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-3">
                  Hi there, please describe the profile you&apos;re looking for.
                </h2>
                <p className="text-muted-foreground">
                  Type a natural language description of your ideal candidate
                </p>
              </div>

              {/* Search input */}
              <div className="relative mb-6">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={EXAMPLE_QUERY}
                  rows={4}
                  className="w-full px-4 py-4 pr-16 border-2 border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none font-sans"
                  disabled={isSearching}
                  data-testid="search-input"
                />
                {/* Send button - positioned inside the textarea */}
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center bg-purple-600 text-white border-2 border-foreground hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Search"
                  data-testid="search-button"
                >
                  {isSearching ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </div>

              {/* Context tags */}
              <div className="border-2 border-foreground bg-background p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Detected Entities
                  </span>
                  {isExtracting && (
                    <span className="w-2 h-2 bg-secondary animate-pulse" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {contextTags.map((tag) => (
                    <ContextTagBadge key={tag.label} tag={tag} />
                  ))}
                </div>
              </div>

              {/* Processing time indicator */}
              {extraction && (
                <div className="mt-4 text-center">
                  <span className="text-xs font-mono text-muted-foreground">
                    Extracted in {extraction.processingTimeMs}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground px-6 py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <span className="font-mono">Powered by AI entity extraction</span>
        </div>
      </footer>

      {/* Rejection Feedback Modal */}
      <RejectionFeedbackModal
        isOpen={rejectionModal.isOpen}
        candidateName={rejectionModal.candidateName}
        onClose={() => setRejectionModal({ isOpen: false, candidateId: null, candidateName: "" })}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50" data-testid="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 border-2 border-foreground
              ${toast.type === "success" ? "bg-green-100 dark:bg-green-900" : ""}
              ${toast.type === "error" ? "bg-red-100 dark:bg-red-900" : ""}
              ${toast.type === "info" ? "bg-background" : ""}
            `}
            data-testid="toast"
          >
            {toast.type === "success" && <CheckCircle size={20} className="text-green-600" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Context Tag Component
// ============================================================================

interface ContextTagBadgeProps {
  tag: ContextTag;
}

function ContextTagBadge({ tag }: ContextTagBadgeProps) {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 border-2 transition-colors
        ${
          tag.isActive
            ? "border-foreground bg-secondary text-secondary-foreground"
            : "border-muted-foreground/30 bg-muted/20 text-muted-foreground"
        }
      `}
    >
      <span className={tag.isActive ? "text-secondary-foreground" : "text-muted-foreground"}>
        {tag.icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-mono uppercase tracking-wider opacity-70">
          {tag.label}
        </span>
        <span className={`text-sm font-medium ${tag.isActive ? "" : "opacity-50"}`}>
          {tag.value || "Not detected"}
        </span>
      </div>
    </div>
  );
}
