import { z } from "zod";

// ============================================================================
// Nullable Helpers
// ============================================================================

/**
 * Helper to handle null values from Gemini (converts null to undefined)
 */
const nullableString = z
  .string()
  .nullable()
  .transform((v) => v ?? undefined)
  .optional();
const nullableNumber = z
  .number()
  .nullable()
  .transform((v) => v ?? undefined)
  .optional();
const nullableStringArray = z
  .array(z.string())
  .nullable()
  .transform((v) => v ?? undefined)
  .optional();

// ============================================================================
// CV Profile Schemas
// ============================================================================

/**
 * Schema for work experience entries
 */
export const workExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(), // e.g., "Jan 2020" or "2020"
  endDate: nullableString, // null means "Present"
  duration: nullableString, // e.g., "2 years 3 months"
  location: nullableString,
  description: nullableString,
  highlights: nullableStringArray, // Key achievements
  technologies: nullableStringArray, // Technologies used
});

/**
 * Schema for education entries
 */
export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(), // e.g., "Bachelor of Science", "Master's"
  field: nullableString, // e.g., "Computer Science"
  startDate: nullableString,
  endDate: nullableString, // Graduation year
  gpa: nullableString,
  honors: nullableStringArray, // Awards, honors, activities
});

/**
 * Schema for skill entries
 */
export const skillSchema = z.object({
  name: z.string(),
  category: z.enum([
    "programming_language",
    "framework",
    "database",
    "cloud",
    "tool",
    "soft_skill",
    "methodology",
    "other",
  ]),
  proficiencyLevel: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .nullable()
    .transform((v) => v ?? undefined)
    .optional(),
  yearsOfExperience: nullableNumber,
});

/**
 * Schema for certification entries
 */
export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  dateObtained: nullableString,
  expirationDate: nullableString,
  credentialId: nullableString,
});

/**
 * Normalize language proficiency values that Gemini might return
 */
const normalizeLanguageProficiency = (
  value: string
): "basic" | "conversational" | "professional" | "native" => {
  const normalized = value.toLowerCase();
  // Map common variations to our expected values
  const mapping: Record<
    string,
    "basic" | "conversational" | "professional" | "native"
  > = {
    basic: "basic",
    beginner: "basic",
    elementary: "basic",
    conversational: "conversational",
    intermediate: "conversational",
    limited_working: "conversational",
    professional: "professional",
    advanced: "professional",
    fluent: "professional",
    full_professional: "professional",
    native: "native",
    native_or_bilingual: "native",
    bilingual: "native",
  };
  return mapping[normalized] || "conversational"; // Default to conversational if unknown
};

/**
 * Schema for language proficiency
 */
export const languageSchema = z.object({
  language: z.string(),
  proficiency: z.string().transform(normalizeLanguageProficiency),
});

/**
 * Full parsed profile schema
 */
export const parsedProfileSchema = z.object({
  // Basic Information
  name: nullableString,
  email: nullableString,
  phone: nullableString,
  location: nullableString,
  linkedIn: nullableString,
  github: nullableString,
  website: nullableString,

  // Professional Summary
  summary: z.string(),

  // Work Experience
  workExperience: z.array(workExperienceSchema),

  // Education
  education: z.array(educationSchema),

  // Skills (categorized)
  skills: z.array(skillSchema),

  // Certifications
  certifications: z.array(certificationSchema),

  // Languages
  languages: z.array(languageSchema),

  // Additional Information
  totalYearsOfExperience: nullableNumber,
  seniorityLevel: z
    .enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "UNKNOWN"])
    .nullable()
    .transform((v) => v ?? undefined)
    .optional(),

  // Metadata
  parsedAt: z.string(),
  parseQuality: z.enum(["high", "medium", "low"]), // How confident is the parsing
  parseNotes: nullableStringArray, // Any issues or notes during parsing
});

// Types inferred from Zod schemas
// These are also available from @/types for consumers who don't need the schemas
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Language = z.infer<typeof languageSchema>;
export type ParsedProfile = z.infer<typeof parsedProfileSchema>;

// Re-export cv types from centralized location for backwards compatibility
// Note: The above Zod-inferred types and @/types are equivalent interfaces
export type {
  SkillCategory,
  ProficiencyLevel,
  LanguageProficiency,
  SeniorityLevel,
  ParseQuality,
} from "@/types";
