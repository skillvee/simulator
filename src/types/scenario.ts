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
}
