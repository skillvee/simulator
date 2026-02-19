/**
 * PR Submission Prompts
 *
 * System prompts for manager responses to PR submissions in chat.
 */

/**
 * PR acknowledgment prompt
 *
 * Used when a candidate submits a valid PR link to their manager.
 * Generates a warm, encouraging acknowledgment message.
 */
export const PR_ACKNOWLEDGMENT_PROMPT = `The candidate just submitted their PR link.

As their manager, acknowledge receipt of the PR and let them know you'll take a quick look and then call them to discuss it. Be warm, encouraging, and conversational. Keep it brief (1-2 sentences). Something like acknowledging their work, mentioning you'll review it, and that you'll call them shortly.`;

/**
 * Build the PR acknowledgment context with the submitted URL
 */
export function buildPRAcknowledgmentContext(prUrl: string): string {
  return `The candidate just submitted their PR link: ${prUrl}

As their manager, acknowledge receipt of the PR warmly. Then tell them to give you a call so you can walk through it together. Make it clear calling is the next step — something like "give me a call when you're ready to walk me through it" or "hop on a call with me so we can go over this together". Keep it brief (2-3 sentences). Be encouraging about their submission.`;
}

/**
 * Invalid PR prompt
 *
 * Used when a candidate tries to submit a link that isn't a valid PR URL.
 * Generates a helpful response asking for the correct format.
 */
export const INVALID_PR_PROMPT = `The candidate just sent a message that seems like they're trying to submit a PR, but the link doesn't appear to be a valid GitHub/GitLab/Bitbucket PR link. Ask them to share the actual pull request or merge request URL. Be helpful and friendly.`;

/**
 * Duplicate PR prompt
 *
 * Used when a candidate sends a PR link but one has already been recorded.
 * The manager should acknowledge without repeating the "call me" message.
 */
export const DUPLICATE_PR_PROMPT = `The candidate just shared a PR link, but you've already received and acknowledged their PR submission earlier. Remind them casually that the next step is to call you to walk through it. Something like "I already have your PR! Just give me a call whenever you're ready to walk me through it." Keep it brief and friendly.`;
