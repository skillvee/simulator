/**
 * Scenario Types
 *
 * Types for simulation scenario configuration, including resources
 * that candidates need to complete their work.
 */

/**
 * Simulation depth controls the length/complexity of the assessment.
 *
 * - "short":  30-min target, 60-min max — focused task, fewer sub-tasks
 * - "medium": 45-min target, 75-min max — standard assessment (default)
 * - "long":   60-min target, 90-min max — deep-dive, more sub-tasks and exploration
 */
export type SimulationDepth = "short" | "medium" | "long";

/** Target and max durations (in minutes) for each depth level */
export const SIMULATION_DEPTH_CONFIG: Record<
  SimulationDepth,
  { targetMinutes: number; maxMinutes: number; label: string; description: string }
> = {
  short: {
    targetMinutes: 30,
    maxMinutes: 60,
    label: "Short",
    description: "~30 min target, up to 60 min",
  },
  medium: {
    targetMinutes: 45,
    maxMinutes: 75,
    label: "Standard",
    description: "~45 min target, up to 75 min",
  },
  long: {
    targetMinutes: 60,
    maxMinutes: 90,
    label: "Deep Dive",
    description: "~60 min target, up to 90 min",
  },
};

/**
 * A resource the candidate needs access to during the simulation.
 * Flexible enough to represent repos, databases, spreadsheets, APIs, dashboards, etc.
 *
 * NOTE: legacy v1 shape. v2 pipelines write to ScenarioDoc / ScenarioDataFile / repoUrl directly.
 */
export interface ScenarioResource {
  /** Resource category — drives icon and display treatment */
  type:
    | "repository"
    | "database"
    | "spreadsheet"
    | "api"
    | "dashboard"
    | "document"
    | "custom";
  /** Human-readable label, e.g. "GitHub Repository", "Data Warehouse", "Sales Data (Excel)" */
  label: string;
  /** Clickable URL (GitHub URL, Google Sheets link, Grafana dashboard, etc.) */
  url?: string;
  /** Access instructions, e.g. "Read-only. User: analyst, Password in 1Password" */
  credentials?: string;
  /** How to get started, e.g. "Clone and create a branch from main" */
  instructions?: string;
  /** Full document content (markdown). Displayed inline in the simulation viewer. */
  content?: string;
  /** Language the resource was generated in (e.g., "en", "es"). Defaults to scenario language. */
  language?: string;
}

// ============================================================================
// v2 resource pipeline types
// ============================================================================

/** A single markdown document produced by Step 1 of the v2 pipeline. */
export interface ScenarioDoc {
  /** Stable id used for cross-referencing and download URLs. */
  id: string;
  /** Display name (e.g., "Project Brief", "Data Dictionary"). */
  name: string;
  /** Filename hint, e.g. "project-brief.md". */
  filename: string;
  /** Short reason this doc exists — drives the judge's coverage check. */
  objective: string;
  /** Full markdown body. */
  markdown: string;
}

/** A scenario-level CSV/data file (DA/DS/DE archetypes). */
export interface ScenarioDataFileShape {
  id: string;
  filename: string;
  storagePath: string;
  bucket: string;
  rowCount: number | null;
  byteSize: number | null;
  sha256: string | null;
  schemaJson: ScenarioDataFileSchema | null;
  previewRows: Record<string, unknown>[] | null;
}

export interface ScenarioDataFileSchema {
  columns: Array<{ name: string; type: string; sample?: unknown }>;
}

/** Step 1 plan output — what the artifact step should produce. */
export interface ResourcePlanItem {
  id: string;
  type: "repository" | "csv" | "document";
  label: string;
  filename: string;
  objective: string;
  candidateUsage: string;
  /** Data-only: target row count. */
  targetRowCount?: number;
  /** Data-only: distribution / signal hints (free text for the model). */
  dataShape?: string;
}

export interface ResourcePlan {
  resources: ResourcePlanItem[];
  qualityCriteria: string[];
}

/** Final step status — drives the recruiter UI. */
export type ResourcePipelineStatus =
  | "planning"
  | "markdown_ready"
  | "artifacts_generating"
  | "validating"
  | "judging"
  | "grounding_coworkers"
  | "passed"
  | "failed";

export interface ResourcePipelineMeta {
  version: "v2";
  status: ResourcePipelineStatus;
  attempts: number;
  lastError?: string;
  judgeSummary?: string;
  blockingIssues?: string[];
  startedAt: string;
  passedAt?: string;
  /** True when coworker knowledge was successfully re-grounded against the
   *  finalized bundle (Step 5). False/missing means the scenario passed but
   *  coworkers retain their pre-pipeline knowledge — fall-back path. */
  coworkersGrounded?: boolean;
}

export interface JudgeVerdict {
  passed: boolean;
  score: number;
  summary: string;
  blockingIssues: string[];
  missingEvidence: string[];
  retryInstructions?: string;
}
