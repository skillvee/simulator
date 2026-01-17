/**
 * Centralized Prompts Module
 *
 * All AI prompts are organized by domain:
 * - hr/        - HR interview prompts
 * - manager/   - Manager kickoff and defense call prompts
 * - coworker/  - Coworker chat and voice prompts
 * - analysis/  - Code review, CV parsing, recording analysis, assessment prompts
 */

// HR Interview
export {
  HR_INTERVIEW_SYSTEM_PROMPT,
  buildHRInterviewPrompt,
  formatCVContextForHR,
  formatBasicCandidateContext,
} from "./hr/interview";

// Manager Calls
export {
  buildManagerKickoffPrompt,
  type KickoffContext,
} from "./manager/kickoff";
export {
  buildDefensePrompt,
  type DefenseContext,
} from "./manager/defense";

// Coworker Personas
export {
  buildCoworkerBasePrompt,
  buildChatPrompt,
  buildVoicePrompt,
  CHAT_GUIDELINES,
  VOICE_GUIDELINES,
  type CoworkerContext,
} from "./coworker/persona";

// Analysis Prompts
export {
  CODE_REVIEW_PROMPT,
  buildCodeReviewContext,
} from "./analysis/code-review";
export { CV_PARSING_PROMPT } from "./analysis/cv-parser";
export {
  SCREENSHOT_ANALYSIS_PROMPT,
  buildScreenshotAnalysisContext,
} from "./analysis/recording";
export {
  NARRATIVE_PROMPT,
  RECOMMENDATIONS_PROMPT,
  CONVERSATION_SUMMARY_PROMPT,
  buildConversationSummaryPrompt,
} from "./analysis/assessment";
