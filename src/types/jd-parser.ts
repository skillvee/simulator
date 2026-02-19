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
 * Role archetype slugs that the AI can classify from a job description.
 * Must match the slugs seeded in the Archetype table (prisma/seed-rubrics.ts).
 */
export type RoleArchetypeSlug =
  // Engineering
  | "frontend_engineer"
  | "backend_engineer"
  | "fullstack_engineer"
  | "tech_lead"
  | "devops_sre"
  // Product Management
  | "growth_pm"
  | "platform_pm"
  | "core_pm"
  // Data Science
  | "analytics_engineer"
  | "data_analyst"
  | "ml_engineer"
  // Program Management
  | "technical_program_manager"
  | "business_program_manager"
  // Sales
  | "account_executive"
  | "sales_development_rep"
  | "solutions_engineer"
  // Customer Success
  | "onboarding_specialist"
  | "customer_success_manager"
  | "renewals_manager";

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
  roleArchetype: ConfidentField<RoleArchetypeSlug>;
}
