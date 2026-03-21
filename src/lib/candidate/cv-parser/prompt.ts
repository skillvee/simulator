import type { Prisma } from "@prisma/client";
import { createLogger } from "@/lib/core";
import { parsedProfileSchema, type ParsedProfile, type Skill } from "./schemas";

const logger = createLogger("lib:candidate:cv-parser");

// ============================================================================
// Profile Formatting for HR Interview
// ============================================================================

/**
 * Formats a parsed profile for inclusion in the HR interviewer's system prompt
 * @param profile - The parsed profile data
 * @returns Formatted string for the system prompt
 */
export function formatProfileForPrompt(profile: ParsedProfile): string {
  const sections: string[] = [];

  // Basic info
  if (profile.name || profile.email || profile.location) {
    const basicInfo = [
      profile.name && `Name: ${profile.name}`,
      profile.email && `Email: ${profile.email}`,
      profile.location && `Location: ${profile.location}`,
      profile.linkedIn && `LinkedIn: ${profile.linkedIn}`,
      profile.github && `GitHub: ${profile.github}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`### Candidate Information\n${basicInfo}`);
  }

  // Summary
  if (profile.summary) {
    sections.push(`### Professional Summary\n${profile.summary}`);
  }

  // Work experience
  if (profile.workExperience.length > 0) {
    const experiences = profile.workExperience
      .map((exp) => {
        const lines = [
          `**${exp.title}** at **${exp.company}**`,
          `${exp.startDate} - ${exp.endDate || "Present"}${exp.duration ? ` (${exp.duration})` : ""}`,
        ];
        if (exp.location) lines.push(`Location: ${exp.location}`);
        if (exp.description) lines.push(`${exp.description}`);
        if (exp.highlights && exp.highlights.length > 0) {
          lines.push(`Key achievements: ${exp.highlights.join("; ")}`);
        }
        if (exp.technologies && exp.technologies.length > 0) {
          lines.push(`Technologies: ${exp.technologies.join(", ")}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
    sections.push(`### Work Experience\n${experiences}`);
  }

  // Education
  if (profile.education.length > 0) {
    const education = profile.education
      .map((edu) => {
        const lines = [
          `**${edu.degree}${edu.field ? ` in ${edu.field}` : ""}** - ${edu.institution}`,
        ];
        if (edu.endDate) lines.push(`Graduated: ${edu.endDate}`);
        if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
        if (edu.honors && edu.honors.length > 0) {
          lines.push(`Honors: ${edu.honors.join(", ")}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
    sections.push(`### Education\n${education}`);
  }

  // Skills by category
  if (profile.skills.length > 0) {
    const skillsByCategory = profile.skills.reduce(
      (acc, skill) => {
        const category = skill.category || "other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill);
        return acc;
      },
      {} as Record<string, Skill[]>
    );

    const categoryLabels: Record<string, string> = {
      programming_language: "Programming Languages",
      framework: "Frameworks & Libraries",
      database: "Databases",
      cloud: "Cloud & Infrastructure",
      tool: "Tools & Platforms",
      soft_skill: "Soft Skills",
      methodology: "Methodologies",
      other: "Other Skills",
    };

    const skillsFormatted = Object.entries(skillsByCategory)
      .map(([category, skills]) => {
        const label = categoryLabels[category] || category;
        const skillsList = skills
          .map(
            (s) =>
              `${s.name}${s.proficiencyLevel ? ` (${s.proficiencyLevel})` : ""}`
          )
          .join(", ");
        return `**${label}:** ${skillsList}`;
      })
      .join("\n");
    sections.push(`### Technical Skills\n${skillsFormatted}`);
  }

  // Certifications
  if (profile.certifications.length > 0) {
    const certs = profile.certifications
      .map(
        (cert) =>
          `- ${cert.name} (${cert.issuer})${cert.dateObtained ? ` - ${cert.dateObtained}` : ""}`
      )
      .join("\n");
    sections.push(`### Certifications\n${certs}`);
  }

  // Languages
  if (profile.languages.length > 0) {
    const langs = profile.languages
      .map((lang) => `${lang.language} (${lang.proficiency})`)
      .join(", ");
    sections.push(`### Languages\n${langs}`);
  }

  // Experience summary
  if (profile.totalYearsOfExperience || profile.seniorityLevel) {
    const summary = [
      profile.totalYearsOfExperience &&
        `Total Experience: ${profile.totalYearsOfExperience} years`,
      profile.seniorityLevel &&
        profile.seniorityLevel !== "UNKNOWN" &&
        `Seniority Level: ${profile.seniorityLevel}`,
    ]
      .filter(Boolean)
      .join(" | ");
    if (summary) {
      sections.push(`### Experience Overview\n${summary}`);
    }
  }

  // Parse quality note
  if (profile.parseQuality !== "high") {
    sections.push(
      `\n*Note: CV parsing quality was ${profile.parseQuality}. Some information may be incomplete or require verification.*`
    );
  }

  return sections.join("\n\n");
}

// ============================================================================
// Prisma JSON Conversion
// ============================================================================

/**
 * Converts a ParsedProfile to Prisma JSON format
 */
export function profileToPrismaJson(
  profile: ParsedProfile
): Prisma.InputJsonValue {
  return profile as unknown as Prisma.InputJsonValue;
}

/**
 * Converts Prisma JSON to ParsedProfile type (with validation)
 */
export function profileFromPrismaJson(
  json: Prisma.JsonValue
): ParsedProfile | null {
  if (!json) return null;
  try {
    return parsedProfileSchema.parse(json);
  } catch {
    logger.warn("Invalid parsed profile data in database");
    return null;
  }
}
