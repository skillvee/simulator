/**
 * Scenario Types
 *
 * Types for simulation scenario configuration, including resources
 * that candidates need to complete their work.
 */

/**
 * Simulation depth controls the duration and complexity of the assessment.
 */
export type SimulationDepth = "short" | "medium" | "long";

/**
 * Configuration for each simulation depth level.
 */
export const SIMULATION_DEPTH_CONFIG: Record<SimulationDepth, { maxMinutes: number }> = {
  short: { maxMinutes: 60 },
  medium: { maxMinutes: 75 },
  long: { maxMinutes: 90 },
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
