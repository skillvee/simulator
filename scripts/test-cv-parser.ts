/**
 * Debug script for CV parsing
 *
 * Run with: npx tsx scripts/test-cv-parser.ts
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

// Get API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in environment");
  process.exit(1);
}

// Initialize Gemini
const gemini = new GoogleGenAI({
  apiKey,
  httpOptions: { apiVersion: "v1alpha" },
});

// Helper to handle null values from Gemini (converts null to undefined)
const nullableString = z.string().nullable().transform(v => v ?? undefined).optional();
const nullableNumber = z.number().nullable().transform(v => v ?? undefined).optional();
const nullableStringArray = z.array(z.string()).nullable().transform(v => v ?? undefined).optional();

// Normalize language proficiency values that Gemini might return
const normalizeLanguageProficiency = (value: string): "basic" | "conversational" | "professional" | "native" => {
  const normalized = value.toLowerCase();
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
  return mapping[normalized] || "conversational";
};

// Schema for validation (same as cv-parser.ts)
const skillSchema = z.object({
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

const parsedProfileSchema = z.object({
  name: nullableString,
  email: nullableString,
  phone: nullableString,
  location: nullableString,
  linkedIn: nullableString,
  github: nullableString,
  website: nullableString,
  summary: z.string(),
  workExperience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: nullableString,
    duration: nullableString,
    location: nullableString,
    description: nullableString,
    highlights: nullableStringArray,
    technologies: nullableStringArray,
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    gpa: nullableString,
    honors: nullableStringArray,
  })),
  skills: z.array(skillSchema),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    dateObtained: nullableString,
    expirationDate: nullableString,
    credentialId: nullableString,
  })),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string().transform(normalizeLanguageProficiency),
  })),
  totalYearsOfExperience: nullableNumber,
  seniorityLevel: z
    .enum(["junior", "mid", "senior", "lead", "principal", "unknown"])
    .nullable()
    .transform(v => v ?? undefined)
    .optional(),
  parsedAt: z.string(),
  parseQuality: z.enum(["high", "medium", "low"]),
  parseNotes: nullableStringArray,
});

// CV Parsing prompt
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

async function main() {
  console.log("🚀 CV Parser Debug Script\n");
  console.log("═".repeat(70));

  // Load the test PDF
  const testPdfPath = join(process.cwd(), "docs", "test-resume.pdf");
  console.log(`📄 Loading PDF: ${testPdfPath}`);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = readFileSync(testPdfPath);
    console.log(`✅ PDF loaded: ${pdfBuffer.length} bytes`);
  } catch (err) {
    console.error(`❌ Failed to load PDF: ${err}`);
    process.exit(1);
  }

  const base64Data = pdfBuffer.toString("base64");
  console.log(`📊 Base64 size: ${base64Data.length} chars\n`);

  // Call Gemini
  console.log("🤖 Calling Gemini API...\n");

  try {
    const result = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
            {
              text: CV_PARSING_PROMPT,
            },
          ],
        },
      ],
    });

    const responseText = result.text;

    console.log("═".repeat(70));
    console.log("RAW GEMINI RESPONSE:");
    console.log("═".repeat(70));
    console.log(responseText);
    console.log("═".repeat(70));
    console.log();

    if (!responseText) {
      console.error("❌ No response from Gemini");
      process.exit(1);
    }

    // Clean the response
    let cleanedResponse = responseText.trim();
    let modifications: string[] = [];

    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
      modifications.push("Removed ```json prefix");
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
      modifications.push("Removed ``` prefix");
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
      modifications.push("Removed ``` suffix");
    }
    cleanedResponse = cleanedResponse.trim();

    if (modifications.length > 0) {
      console.log("🔧 Response cleaning:");
      modifications.forEach(m => console.log(`   - ${m}`));
      console.log();
    }

    // Try JSON parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedResponse);
      console.log("✅ JSON parse successful\n");
    } catch (jsonError) {
      console.error("❌ JSON PARSE ERROR:");
      console.error(jsonError);
      console.error("\nCleaned response that failed:");
      console.error(cleanedResponse);
      process.exit(1);
    }

    // Pretty print
    console.log("═".repeat(70));
    console.log("PARSED JSON:");
    console.log("═".repeat(70));
    console.log(JSON.stringify(parsed, null, 2));
    console.log("═".repeat(70));
    console.log();

    // Validate with Zod
    const validationResult = parsedProfileSchema.safeParse(parsed);

    if (validationResult.success) {
      console.log("✅ ZOD VALIDATION SUCCESS\n");
      const data = validationResult.data;
      console.log("📊 Results:");
      console.log(`   Parse quality: ${data.parseQuality}`);
      console.log(`   Name: ${data.name || "(not found)"}`);
      console.log(`   Email: ${data.email || "(not found)"}`);
      console.log(`   Work experience: ${data.workExperience.length} entries`);
      console.log(`   Education: ${data.education.length} entries`);
      console.log(`   Skills: ${data.skills.length} entries`);
      console.log(`   Certifications: ${data.certifications.length} entries`);
      console.log(`   Languages: ${data.languages.length} entries`);
      console.log(`   Total years: ${data.totalYearsOfExperience || "(not calculated)"}`);
      console.log(`   Seniority: ${data.seniorityLevel || "(not determined)"}`);

      if (data.parseNotes?.length) {
        console.log("\n📝 Parse notes:");
        data.parseNotes.forEach(note => console.log(`   - ${note}`));
      }
    } else {
      console.error("❌ ZOD VALIDATION ERRORS:\n");
      validationResult.error.issues.forEach((issue, index) => {
        console.error(`Error ${index + 1}:`);
        console.error(`   Path: ${issue.path.join(".") || "(root)"}`);
        console.error(`   Code: ${issue.code}`);
        console.error(`   Message: ${issue.message}`);
        if ("expected" in issue) {
          console.error(`   Expected: ${issue.expected}`);
        }
        if ("received" in issue) {
          console.error(`   Received: ${issue.received}`);
        }

        // Show actual value at path
        if (issue.path.length > 0) {
          let value: unknown = parsed;
          for (const key of issue.path) {
            value = (value as Record<string, unknown>)?.[key];
          }
          console.error(`   Actual value: ${JSON.stringify(value)}`);
        }
        console.error();
      });

      // Check for common issues
      const parsedObj = parsed as Record<string, unknown>;

      // Check skills
      const skills = (parsedObj.skills || []) as Array<{ category?: string; proficiencyLevel?: string }>;
      const validCategories = ["programming_language", "framework", "database", "cloud", "tool", "soft_skill", "methodology", "other"];
      const invalidCategories = skills.filter(s => s.category && !validCategories.includes(s.category));
      if (invalidCategories.length > 0) {
        console.log("⚠️ Invalid skill categories found:");
        invalidCategories.forEach(s => console.log(`   - "${s.category}"`));
        console.log(`   Valid categories: ${validCategories.join(", ")}\n`);
      }

      // Check proficiency
      const validProficiency = ["beginner", "intermediate", "advanced", "expert"];
      const invalidProficiency = skills.filter(s => s.proficiencyLevel && !validProficiency.includes(s.proficiencyLevel));
      if (invalidProficiency.length > 0) {
        console.log("⚠️ Invalid proficiency levels found:");
        invalidProficiency.forEach(s => console.log(`   - "${s.proficiencyLevel}"`));
        console.log(`   Valid levels: ${validProficiency.join(", ")}\n`);
      }

      // Check languages
      const languages = (parsedObj.languages || []) as Array<{ proficiency?: string }>;
      const validLangProf = ["basic", "conversational", "professional", "native"];
      const invalidLang = languages.filter(l => l.proficiency && !validLangProf.includes(l.proficiency));
      if (invalidLang.length > 0) {
        console.log("⚠️ Invalid language proficiency found:");
        invalidLang.forEach(l => console.log(`   - "${l.proficiency}"`));
        console.log(`   Valid levels: ${validLangProf.join(", ")}\n`);
      }

      process.exit(1);
    }

  } catch (error) {
    console.error("❌ API Error:", error);
    process.exit(1);
  }

  console.log("\n✅ CV parsing completed successfully!");
}

main();
