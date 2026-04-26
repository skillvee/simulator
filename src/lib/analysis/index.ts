// Analysis utilities - ai-call-logging, assessment-logging, video-evaluation, video-merge, report
export * from "./ai-call-logging";
export * from "./assessment-logging";
export * from "./video-evaluation";
export * from "./video-merge";
export * from "./deliverable-parser";
export * from "./report-data";
export * from "./report-migration";
export * from "./report-scoring";
export * from "./translation-helpers";
export * from "./generate-report";
export * from "./candidate-narrative";
// NOTE: `finalize-assessment` is NOT re-exported from this barrel. It pulls
// in `@/lib/candidate` (for profile-photo), which transitively pulls
// `@/lib/external` (for STORAGE_BUCKETS) — adding it here would force every
// consumer of the analysis barrel to mock those dependencies. Import it
// directly: `import { finalizeAssessment } from "@/lib/analysis/finalize-assessment"`.
