/**
 * Job Description Parser Types
 *
 * Types for the job description parsing API that extracts structured data
 * from pasted job descriptions using Gemini Flash.
 */

/**
 * Confidence level for extracted fields
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Seniority level inferred from job description
 */
export type InferredSeniorityLevel = "junior" | "mid" | "senior" | "staff";

/**
 * Field with confidence metadata
 */
export interface ConfidentField<T> {
  value: T | null;
  confidence: ConfidenceLevel;
}

/**
 * Request body for POST /api/recruiter/simulations/parse-jd
 */
export interface ParseJDRequest {
  jobDescription: string;
}

/**
 * Response from POST /api/recruiter/simulations/parse-jd
 */
export interface ParseJDResponse {
  roleName: ConfidentField<string>;
  companyName: ConfidentField<string>;
  companyDescription: ConfidentField<string>;
  techStack: ConfidentField<string[]>;
  seniorityLevel: ConfidentField<InferredSeniorityLevel>;
  keyResponsibilities: ConfidentField<string[]>;
  domainContext: ConfidentField<string>;
}
