import { gemini } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// ============================================================================
// CV Profile Schemas
// ============================================================================

/**
 * Helper to handle null values from Gemini (converts null to undefined)
 */
const nullableString = z.string().nullable().transform(v => v ?? undefined).optional();
const nullableNumber = z.number().nullable().transform(v => v ?? undefined).optional();
const nullableStringArray = z.array(z.string()).nullable().transform(v => v ?? undefined).optional();

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
    .transform(v => v ?? undefined)
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
const normalizeLanguageProficiency = (value: string): "basic" | "conversational" | "professional" | "native" => {
  const normalized = value.toLowerCase();
  // Map common variations to our expected values
  const mapping: Record<string, "basic" | "conversational" | "professional" | "native"> = {
    "basic": "basic",
    "beginner": "basic",
    "elementary": "basic",
    "conversational": "conversational",
    "intermediate": "conversational",
    "limited_working": "conversational",
    "professional": "professional",
    "advanced": "professional",
    "fluent": "professional",
    "full_professional": "professional",
    "native": "native",
    "native_or_bilingual": "native",
    "bilingual": "native",
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
    .enum(["junior", "mid", "senior", "lead", "principal", "unknown"])
    .nullable()
    .transform(v => v ?? undefined)
    .optional(),

  // Metadata
  parsedAt: z.string(),
  parseQuality: z.enum(["high", "medium", "low"]), // How confident is the parsing
  parseNotes: nullableStringArray, // Any issues or notes during parsing
});

export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Language = z.infer<typeof languageSchema>;
export type ParsedProfile = z.infer<typeof parsedProfileSchema>;

// ============================================================================
// CV Parsing Prompt
// ============================================================================

const CV_PARSING_PROMPT = `You are an expert CV/resume parser. Extract structured information from the provided CV content.

## Instructions
1. Extract all relevant information accurately
2. Normalize dates to a consistent format (e.g., "Jan 2020" or just "2020")
3. Identify technical skills and categorize them appropriately
4. Estimate seniority level based on years of experience and roles
5. If information is unclear or missing, omit it rather than guess
6. Provide quality notes if the CV is difficult to parse or has issues

## Response Format
Return a JSON object with the following structure:

{
  "name": "<full name if found>",
  "email": "<email if found>",
  "phone": "<phone if found>",
  "location": "<city, state/country if found>",
  "linkedIn": "<LinkedIn URL if found>",
  "github": "<GitHub URL if found>",
  "website": "<personal website if found>",

  "summary": "<professional summary - write one if not provided, 2-3 sentences describing the candidate's background>",

  "workExperience": [
    {
      "company": "<company name>",
      "title": "<job title>",
      "startDate": "<start date, e.g., 'Jan 2020'>",
      "endDate": "<end date or null if current>",
      "duration": "<calculated duration, e.g., '2 years 3 months'>",
      "location": "<job location if mentioned>",
      "description": "<brief description of the role>",
      "highlights": ["<key achievement 1>", "<key achievement 2>"],
      "technologies": ["<tech 1>", "<tech 2>"]
    }
  ],

  "education": [
    {
      "institution": "<school/university name>",
      "degree": "<degree type>",
      "field": "<field of study>",
      "startDate": "<start year>",
      "endDate": "<graduation year>",
      "gpa": "<GPA if mentioned>",
      "honors": ["<honor 1>", "<activity 1>"]
    }
  ],

  "skills": [
    {
      "name": "<skill name>",
      "category": "<programming_language|framework|database|cloud|tool|soft_skill|methodology|other>",
      "proficiencyLevel": "<beginner|intermediate|advanced|expert>",
      "yearsOfExperience": <number or null>
    }
  ],

  "certifications": [
    {
      "name": "<certification name>",
      "issuer": "<issuing organization>",
      "dateObtained": "<date>",
      "expirationDate": "<date if applicable>",
      "credentialId": "<credential ID if provided>"
    }
  ],

  "languages": [
    {
      "language": "<language name>",
      "proficiency": "<basic|conversational|professional|native>"
    }
  ],

  "totalYearsOfExperience": <estimated total years in the industry>,
  "seniorityLevel": "<junior|mid|senior|lead|principal|unknown>",

  "parsedAt": "<ISO timestamp>",
  "parseQuality": "<high|medium|low>",
  "parseNotes": ["<any parsing issues or notes>"]
}

## Seniority Guidelines
- Junior: 0-2 years, entry-level roles
- Mid: 2-5 years, independent contributor
- Senior: 5-8 years, experienced individual contributor
- Lead: 8+ years with leadership experience
- Principal: Staff/Principal level roles

## Parse Quality Guidelines
- High: Clear, well-formatted CV with all sections
- Medium: Some missing information or formatting issues
- Low: Difficult to parse, significant missing information

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.

## CV Content
`;

// ============================================================================
// CV Content Fetching
// ============================================================================

/**
 * Fetches the raw content of a CV from Supabase storage
 * @param cvUrl - The signed URL or storage path of the CV
 * @returns The text content of the CV
 */
export async function fetchCvContent(cvUrl: string): Promise<string> {
  try {
    // If it's a signed URL, extract the path
    let storagePath = cvUrl;
    if (cvUrl.includes("supabase.co")) {
      // Extract path from signed URL
      const url = new URL(cvUrl);
      const pathMatch = url.pathname.match(
        /\/storage\/v1\/object\/sign\/resumes\/(.+)/
      );
      if (pathMatch) {
        storagePath = pathMatch[1];
      }
    }

    // Download the file
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RESUMES)
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Failed to download CV: ${error?.message}`);
    }

    // Get the content type to determine how to extract text
    const contentType = data.type;

    // For text files, just read directly
    if (contentType === "text/plain") {
      return await data.text();
    }

    // For PDF and other documents, we'll use Gemini's vision capability
    // Convert blob to base64
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return `[BASE64_FILE:${contentType}:${base64}]`;
  } catch (error) {
    console.error("Error fetching CV content:", error);
    throw error;
  }
}

// ============================================================================
// Main Parsing Function
// ============================================================================

/**
 * Parses a CV using Gemini AI
 * @param cvUrl - The URL or path to the CV file
 * @returns Parsed profile data
 */
export async function parseCv(cvUrl: string): Promise<ParsedProfile> {
  // Fetch the CV content
  const cvContent = await fetchCvContent(cvUrl);

  let contents: Array<{
    role: "user";
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;

  // Check if we have a base64 file (PDF, DOC, etc.)
  if (cvContent.startsWith("[BASE64_FILE:")) {
    const match = cvContent.match(/\[BASE64_FILE:(.+?):(.+)\]/);
    if (match) {
      const [, mimeType, base64Data] = match;
      contents = [
        {
          role: "user" as const,
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: CV_PARSING_PROMPT,
            },
          ],
        },
      ];
    } else {
      throw new Error("Invalid base64 file format");
    }
  } else {
    // Plain text CV
    contents = [
      {
        role: "user" as const,
        parts: [
          {
            text: `${CV_PARSING_PROMPT}\n\n${cvContent}`,
          },
        ],
      },
    ];
  }

  // Call Gemini for parsing
  const result = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
  });

  const responseText = result.text;

  if (!responseText) {
    throw new Error("No response from Gemini");
  }

  // Clean the response (remove markdown code blocks if present)
  let cleanedResponse = responseText.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith("```")) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  cleanedResponse = cleanedResponse.trim();

  // Parse and validate the response
  try {
    const parsed = JSON.parse(cleanedResponse);

    // Add timestamp if not present
    if (!parsed.parsedAt) {
      parsed.parsedAt = new Date().toISOString();
    }

    // Validate with Zod
    const validated = parsedProfileSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    console.error("Raw response:", responseText);

    // Return a minimal profile if parsing fails
    return {
      summary:
        "Unable to fully parse CV content. Manual review recommended.",
      workExperience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      parsedAt: new Date().toISOString(),
      parseQuality: "low",
      parseNotes: [
        `Parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

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
        profile.seniorityLevel !== "unknown" &&
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
    console.warn("Invalid parsed profile data in database");
    return null;
  }
}
