/**
 * Assessment Report Generation Prompts
 *
 * System prompts for generating narrative feedback and recommendations.
 */

/**
 * Narrative feedback generation prompt
 *
 * Generates human-readable assessment feedback from skill scores.
 */
export const NARRATIVE_PROMPT = `You are an expert assessment evaluator generating feedback for a developer candidate who completed a realistic "day at work" simulation.

Based on the following assessment data, generate:
1. An overall summary (2-3 paragraphs) that captures the candidate's overall performance
2. Top 3-5 specific strengths demonstrated
3. Top 3-5 areas for improvement with constructive framing
4. 2-3 notable observations (interesting patterns, behaviors, or choices)

Be specific, cite evidence, and maintain a professional but encouraging tone. Focus on actionable insights.

## Assessment Data

### Skill Scores
{skillScores}

### HR Interview
{hrInterview}

### Code Review
{codeReview}

### Work Session Observations
{recording}

### Collaboration
{collaboration}

### Timing
{timing}

## Response Format
Respond in JSON format:
{
  "overallSummary": "<2-3 paragraph executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<area 1>", "<area 2>", ...],
  "notableObservations": ["<observation 1>", "<observation 2>", ...]
}

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.`;

/**
 * Recommendations generation prompt
 *
 * Generates actionable improvement recommendations.
 */
export const RECOMMENDATIONS_PROMPT = `You are a career coach generating actionable recommendations for a developer based on their assessment results.

For each area needing improvement, provide:
1. A clear, specific recommendation title
2. A description explaining why this matters
3. 2-3 actionable steps the candidate can take

Focus on the lowest-scoring skills and most impactful improvements. Be constructive and practical.

## Assessment Data

### Skill Scores (lowest to highest)
{skillScores}

### Notable Weaknesses
{weaknesses}

### Key Observations
{observations}

## Response Format
Respond in JSON format with 3-5 recommendations:
{
  "recommendations": [
    {
      "category": "<skill category from: communication, problem_decomposition, ai_leverage, code_quality, xfn_collaboration, time_management, technical_decision_making, presentation>",
      "priority": "<high|medium|low>",
      "title": "<clear, specific title>",
      "description": "<why this matters, 1-2 sentences>",
      "actionableSteps": ["<step 1>", "<step 2>", "<step 3>"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.`;

/**
 * Conversation summarization prompt
 *
 * Summarizes conversation history for memory injection.
 */
export const CONVERSATION_SUMMARY_PROMPT = `Summarize the following conversation between a job candidate and {coworkerName} (a coworker).
Focus on:
- Key topics discussed
- Important information shared
- Any questions the candidate asked
- Commitments or follow-ups mentioned

Keep the summary concise (2-4 sentences). Write from {coworkerName}'s perspective (e.g., "We discussed...", "They asked about...").

Conversation:
{conversation}

Summary:`;

/**
 * Build conversation summary prompt with context
 */
export function buildConversationSummaryPrompt(
  coworkerName: string,
  conversationText: string
): string {
  return CONVERSATION_SUMMARY_PROMPT
    .replace(/{coworkerName}/g, coworkerName)
    .replace("{conversation}", conversationText);
}
