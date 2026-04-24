/**
 * Centralized Prompts Module
 *
 * All AI prompts are organized by domain:
 * - build-agent-prompt - Universal prompt builder for all LLM interactions
 * - manager/   - Manager defense call and PR submission prompts
 * - coworker/  - Coworker persona base prompts and guidelines
 * - analysis/  - Rubric evaluation, CV parsing, feedback/entity extraction prompts
 */

// Universal Agent Prompt Builder
export {
  buildAgentPrompt,
  buildDefensePhaseContext,
  type AgentPromptContext,
  type SimulationPhase,
  type DefensePhaseContext,
} from "./build-agent-prompt";

// Manager - Defense (used by unified builder for phase context)
export { buildDefensePrompt, type DefenseContext } from "./manager/defense";


// Coworker Personas (base builders still used by unified builder)
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
  CANDIDATE_FEEDBACK_PROMPT_VERSION,
  buildCandidateFeedbackPrompt,
  type CandidateFeedbackInput,
} from "./analysis/candidate-feedback";
export {
  FEEDBACK_PARSING_PROMPT,
  buildFeedbackParsingContext,
} from "./analysis/feedback-parsing";
export {
  ENTITY_EXTRACTION_PROMPT,
  buildEntityExtractionContext,
} from "./analysis/entity-extraction";
