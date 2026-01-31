/**
 * Centralized Prompts Module
 *
 * All AI prompts are organized by domain:
 * - manager/   - Manager defense call and PR submission prompts
 * - coworker/  - Coworker chat and voice prompts
 * - analysis/  - Code review, CV parsing, recording analysis, assessment prompts
 */

// Manager Calls
export { buildDefensePrompt, type DefenseContext } from "./manager/defense";
export {
  PR_ACKNOWLEDGMENT_PROMPT,
  buildPRAcknowledgmentContext,
  INVALID_PR_PROMPT,
} from "./manager/pr-submission";

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
export {
  VIDEO_EVALUATION_PROMPT,
  EVALUATION_PROMPT_VERSION,
  ASSESSMENT_DIMENSIONS,
  buildVideoEvaluationPrompt,
  type VideoEvaluationOutput,
  type AssessmentDimensionType,
} from "./analysis/video-evaluation";
export {
  FEEDBACK_PARSING_PROMPT,
  buildFeedbackParsingContext,
} from "./analysis/feedback-parsing";
export {
  ENTITY_EXTRACTION_PROMPT,
  buildEntityExtractionContext,
} from "./analysis/entity-extraction";
