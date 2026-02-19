/**
 * Centralized Prompts Module
 *
 * All AI prompts are organized by domain:
 * - manager/   - Manager defense call and PR submission prompts
 * - coworker/  - Coworker chat and voice prompts
 * - analysis/  - Rubric evaluation, CV parsing, feedback/entity extraction prompts
 */

// Manager Calls
export { buildDefensePrompt, type DefenseContext } from "./manager/defense";
export {
  PR_ACKNOWLEDGMENT_PROMPT,
  buildPRAcknowledgmentContext,
  INVALID_PR_PROMPT,
  DUPLICATE_PR_PROMPT,
} from "./manager/pr-submission";
export {
  buildGreetingPrompt,
  type GreetingPromptContext,
} from "./manager/greeting";

// Coworker Personas
export {
  buildCoworkerBasePrompt,
  buildChatPrompt,
  buildVoicePrompt,
  buildCallNudgeInstruction,
  getPersonalityGuidelines,
  CHAT_GUIDELINES,
  VOICE_GUIDELINES,
  type CoworkerContext,
} from "./coworker/persona";

// Analysis Prompts
export { CV_PARSING_PROMPT } from "./analysis/cv-parser";
export {
  RUBRIC_EVALUATION_PROMPT_VERSION,
  buildRubricEvaluationPrompt,
  type RubricPromptInput,
  type DimensionWithRubric,
  type RubricLevelData,
  type RedFlagData,
} from "./analysis/rubric-evaluation";
export {
  FEEDBACK_PARSING_PROMPT,
  buildFeedbackParsingContext,
} from "./analysis/feedback-parsing";
export {
  ENTITY_EXTRACTION_PROMPT,
  buildEntityExtractionContext,
} from "./analysis/entity-extraction";
