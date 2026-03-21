// CV Parser - split into focused modules
//
// schemas.ts — Zod schema definitions and inferred types
// parser.ts — CV content fetching and AI-powered parsing
// prompt.ts — Profile formatting for prompts and Prisma JSON conversion

export {
  workExperienceSchema,
  educationSchema,
  skillSchema,
  certificationSchema,
  languageSchema,
  parsedProfileSchema,
  type WorkExperience,
  type Education,
  type Skill,
  type Certification,
  type Language,
  type ParsedProfile,
  type SkillCategory,
  type ProficiencyLevel,
  type LanguageProficiency,
  type SeniorityLevel,
  type ParseQuality,
} from "./schemas";

export { fetchCvContent, parseCv } from "./parser";

export {
  formatProfileForPrompt,
  profileToPrismaJson,
  profileFromPrismaJson,
} from "./prompt";
