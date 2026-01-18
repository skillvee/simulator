/**
 * CV/Profile Types
 *
 * Types for parsed CV/resume data extracted by Gemini AI.
 */

/**
 * Work experience entry
 */
export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string; // undefined means "Present"
  duration?: string;
  location?: string;
  description?: string;
  highlights?: string[];
  technologies?: string[];
}

/**
 * Education entry
 */
export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  honors?: string[];
}

/**
 * Skill categories
 */
export type SkillCategory =
  | "programming_language"
  | "framework"
  | "database"
  | "cloud"
  | "tool"
  | "soft_skill"
  | "methodology"
  | "other";

/**
 * Proficiency levels
 */
export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

/**
 * Skill entry with category and proficiency
 */
export interface Skill {
  name: string;
  category: SkillCategory;
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
}

/**
 * Certification entry
 */
export interface Certification {
  name: string;
  issuer: string;
  dateObtained?: string;
  expirationDate?: string;
  credentialId?: string;
}

/**
 * Language proficiency levels
 */
export type LanguageProficiency =
  | "basic"
  | "conversational"
  | "professional"
  | "native";

/**
 * Language proficiency entry
 */
export interface Language {
  language: string;
  proficiency: LanguageProficiency;
}

/**
 * Seniority levels
 */
export type SeniorityLevel =
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "principal"
  | "unknown";

/**
 * Parse quality indicator
 */
export type ParseQuality = "high" | "medium" | "low";

/**
 * Full parsed profile from CV
 * Stored in Prisma JSON field (User.parsedProfile, Assessment.parsedProfile)
 */
export interface ParsedProfile {
  // Basic Information
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  website?: string;

  // Professional Summary
  summary: string;

  // Work Experience
  workExperience: WorkExperience[];

  // Education
  education: Education[];

  // Skills (categorized)
  skills: Skill[];

  // Certifications
  certifications: Certification[];

  // Languages
  languages: Language[];

  // Additional Information
  totalYearsOfExperience?: number;
  seniorityLevel?: SeniorityLevel;

  // Metadata
  parsedAt: string;
  parseQuality: ParseQuality;
  parseNotes?: string[];
}
