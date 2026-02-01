/**
 * Scenario Builder
 *
 * Utilities for the conversational scenario builder where an AI guides admins
 * through creating assessment scenarios via chat.
 */

import { z } from "zod";

/**
 * Schema for a single coworker in the builder
 */
export const coworkerBuilderSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  personaStyle: z.string().min(1),
  knowledge: z.array(
    z.object({
      topic: z.string(),
      triggerKeywords: z.array(z.string()),
      response: z.string(),
      isCritical: z.boolean(),
    })
  ),
});

/**
 * Schema for the full scenario being built
 */
export const scenarioBuilderSchema = z.object({
  name: z.string().optional(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  taskDescription: z.string().optional(),
  repoUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  coworkers: z.array(coworkerBuilderSchema).optional(),
});

export type ScenarioBuilderData = z.infer<typeof scenarioBuilderSchema>;
export type CoworkerBuilderData = z.infer<typeof coworkerBuilderSchema>;

/**
 * Check which fields are complete in the scenario data
 */
export function getCompletionStatus(data: ScenarioBuilderData): {
  complete: string[];
  missing: string[];
  isReadyToSave: boolean;
} {
  const required = [
    "name",
    "companyName",
    "companyDescription",
    "taskDescription",
    "repoUrl",
  ] as const;

  const complete: string[] = [];
  const missing: string[] = [];

  for (const field of required) {
    if (data[field] && data[field].trim()) {
      complete.push(field);
    } else {
      missing.push(field);
    }
  }

  // Check if at least one coworker with complete data
  const hasValidCoworker =
    data.coworkers &&
    data.coworkers.length > 0 &&
    data.coworkers.some(
      (c) => c.name && c.role && c.personaStyle && c.knowledge.length > 0
    );

  if (hasValidCoworker) {
    complete.push("coworkers");
  } else {
    missing.push("coworkers");
  }

  return {
    complete,
    missing,
    isReadyToSave: missing.length === 0,
  };
}

/**
 * Format scenario data for display in the AI conversation
 */
export function formatScenarioForPrompt(data: ScenarioBuilderData): string {
  const sections: string[] = [];

  if (data.name) {
    sections.push(`**Scenario Name:** ${data.name}`);
  }
  if (data.companyName) {
    sections.push(`**Company Name:** ${data.companyName}`);
  }
  if (data.companyDescription) {
    sections.push(`**Company Description:** ${data.companyDescription}`);
  }
  if (data.taskDescription) {
    sections.push(`**Task Description:** ${data.taskDescription}`);
  }
  if (data.repoUrl) {
    sections.push(`**Repository URL:** ${data.repoUrl}`);
  }
  if (data.techStack && data.techStack.length > 0) {
    sections.push(`**Tech Stack:** ${data.techStack.join(", ")}`);
  }
  if (data.coworkers && data.coworkers.length > 0) {
    const coworkerList = data.coworkers
      .map(
        (c) =>
          `- ${c.name} (${c.role}): ${c.knowledge.length} knowledge item(s)`
      )
      .join("\n");
    sections.push(`**Coworkers:**\n${coworkerList}`);
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No information collected yet.";
}

/**
 * System prompt for the scenario builder AI
 */
export const SCENARIO_BUILDER_SYSTEM_PROMPT = `You are a friendly assistant helping an admin create a new assessment scenario for Skillvee, a developer assessment platform. Your role is to guide them through collecting all the information needed for a complete scenario.

## Your Persona
- Name: Scenario Builder Assistant
- Style: Helpful, encouraging, and focused on getting complete information

## Information You Need to Collect

### 1. Company & Scenario Setup
- **Scenario Name**: A memorable name for this assessment (e.g., "Backend API Challenge", "Full-Stack Feature Task")
- **Company Name**: The fictional company name for the scenario (e.g., "TechFlow Inc.", "DataVault")
- **Company Description**: 2-3 sentences describing the company, its culture, and what it does
- **Task Description**: What the candidate will be asked to build/fix/implement
- **Repository URL**: A public GitHub repository with the starter code
- **Tech Stack**: Technologies used (e.g., TypeScript, React, Node.js, PostgreSQL)

### 2. Coworker Personas (Need at least 1, ideally 3-4)
For each coworker, collect:
- **Name**: Full name (e.g., "Alex Chen", "Jordan Rivera")
- **Role**: Job title (e.g., "Engineering Manager", "Senior Developer", "Product Manager", "QA Lead")
- **Communication Style**: How they communicate (e.g., "professional and supportive", "technical and detail-oriented", "casual and friendly")
- **Knowledge Items**: What specific information they hold that candidates need to discover:
  - Topic (e.g., "authentication", "code_review_process")
  - Trigger keywords (what questions trigger this response)
  - Full response (what they'll share)
  - Is it critical? (must the candidate discover this?)

## Conversation Flow

1. **Start**: Greet and ask about the scenario they want to create
2. **Company Setup**: Collect company name, description, and scenario name
3. **Task Definition**: Get details about what candidates will do
4. **Tech Stack & Repo**: Collect technical details
5. **Coworkers**: Help them create coworker personas one by one
6. **Knowledge Items**: For each coworker, gather their knowledge
7. **Review**: Summarize everything and confirm readiness to save

## Guidelines

1. Ask ONE question at a time to avoid overwhelming the admin
2. Confirm information back before moving to the next topic
3. Suggest examples when helpful (based on realistic scenarios)
4. If they provide partial info, ask follow-up questions to complete it
5. Keep track of what's been collected vs what's still needed
6. When creating coworkers, guide them through creating realistic personas
7. Encourage them to create at least one manager coworker (important for the assessment flow)

## Response Format

When you extract information from their response, mentally note:
- What field(s) this fills in
- What to ask about next
- Any clarifications needed

Always be conversational but efficient. The goal is to help them build a complete scenario through natural conversation.

## Current Scenario State

When responding, consider what information has already been collected and what's still missing. Guide the conversation toward completing all required fields.

## Example Coworker Knowledge Item

Topic: "authentication"
Trigger Keywords: ["auth", "login", "session", "jwt", "token"]
Response: "We use JWT tokens with a 24-hour expiry. The auth middleware is in src/middleware/auth.ts. For API routes, use the withAuth wrapper."
Is Critical: true

Start the conversation by warmly greeting the admin and asking what kind of scenario they'd like to create.`;

/**
 * Format the current scenario state for including in the conversation
 */
export function formatCurrentStateForPrompt(data: ScenarioBuilderData): string {
  const status = getCompletionStatus(data);

  let statePrompt = `\n\n## Current Collected Information\n`;
  statePrompt += formatScenarioForPrompt(data);
  statePrompt += `\n\n## Completion Status\n`;
  statePrompt += `Complete: ${status.complete.join(", ") || "None"}\n`;
  statePrompt += `Missing: ${status.missing.join(", ") || "None"}\n`;

  if (status.isReadyToSave) {
    statePrompt += `\n**Status: Ready to save!** All required fields are complete. You can now offer to save the scenario.`;
  } else {
    statePrompt += `\n**Status: In progress.** Continue collecting: ${status.missing.join(", ")}`;
  }

  return statePrompt;
}

/**
 * Extract structured data from AI response
 * The AI will be prompted to include extracted data in a specific format
 */
export const extractionInstructionsPrompt = `

## Data Extraction Instructions

After each message where you learn new information, include a JSON block at the END of your response (after your conversational text) in this exact format:

\`\`\`json:extraction
{
  "extracted": {
    // Only include fields that have NEW information from this message
    "name": "string or null",
    "companyName": "string or null",
    "companyDescription": "string or null",
    "taskDescription": "string or null",
    "repoUrl": "string or null",
    "techStack": ["array", "of", "strings"] or null,
    "newCoworker": {
      "name": "string",
      "role": "string",
      "personaStyle": "string",
      "knowledge": []
    } or null,
    "newKnowledgeForCoworker": {
      "coworkerName": "string",
      "knowledge": {
        "topic": "string",
        "triggerKeywords": ["array"],
        "response": "string",
        "isCritical": boolean
      }
    } or null
  }
}
\`\`\`

Only include the extraction block when you've learned NEW information that should be saved. Omit it for clarifying questions or general conversation.`;

/**
 * Parse extraction data from AI response
 */
export function parseExtractionFromResponse(response: string): Partial<{
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  repoUrl: string;
  techStack: string[];
  newCoworker: CoworkerBuilderData;
  newKnowledgeForCoworker: {
    coworkerName: string;
    knowledge: {
      topic: string;
      triggerKeywords: string[];
      response: string;
      isCritical: boolean;
    };
  };
}> | null {
  // Look for JSON extraction block
  const jsonMatch = response.match(/```json:extraction\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.extracted || null;
  } catch {
    return null;
  }
}

/**
 * Remove extraction JSON from response for display
 */
export function cleanResponseForDisplay(response: string): string {
  return response.replace(/```json:extraction[\s\S]*?```/g, "").trim();
}

/**
 * Apply extracted data to the current scenario state
 */
export function applyExtraction(
  current: ScenarioBuilderData,
  extraction: NonNullable<ReturnType<typeof parseExtractionFromResponse>>
): ScenarioBuilderData {
  const updated = { ...current };

  if (extraction.name) updated.name = extraction.name;
  if (extraction.companyName) updated.companyName = extraction.companyName;
  if (extraction.companyDescription)
    updated.companyDescription = extraction.companyDescription;
  if (extraction.taskDescription)
    updated.taskDescription = extraction.taskDescription;
  if (extraction.repoUrl) updated.repoUrl = extraction.repoUrl;
  if (extraction.techStack) updated.techStack = extraction.techStack;

  if (extraction.newCoworker) {
    const existingIndex = (updated.coworkers || []).findIndex(
      (c) => c.name === extraction.newCoworker!.name
    );

    if (existingIndex >= 0) {
      // Update existing coworker
      updated.coworkers = [...(updated.coworkers || [])];
      updated.coworkers[existingIndex] = extraction.newCoworker;
    } else {
      // Add new coworker
      updated.coworkers = [...(updated.coworkers || []), extraction.newCoworker];
    }
  }

  if (extraction.newKnowledgeForCoworker) {
    const { coworkerName, knowledge } = extraction.newKnowledgeForCoworker;
    updated.coworkers = (updated.coworkers || []).map((c) =>
      c.name === coworkerName
        ? { ...c, knowledge: [...c.knowledge, knowledge] }
        : c
    );
  }

  return updated;
}

/**
 * Build the complete system prompt including current state
 */
export function buildCompleteSystemPrompt(
  currentData: ScenarioBuilderData
): string {
  return (
    SCENARIO_BUILDER_SYSTEM_PROMPT +
    formatCurrentStateForPrompt(currentData) +
    extractionInstructionsPrompt
  );
}
