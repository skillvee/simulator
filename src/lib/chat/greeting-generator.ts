/**
 * Manager Greeting Generator
 *
 * Generates initial greeting messages for the manager chat interface.
 * Extracted from the welcome page for reuse across routes.
 */

import { ChatMessage } from "@/types";

/**
 * Context required to generate manager greeting messages
 */
export interface GreetingContext {
  userName: string;
  managerName: string;
  managerRole: string;
  companyName: string;
  repoUrl: string;
  taskDescription: string;
}

/**
 * Generates the manager's initial greeting messages for the chat interface.
 *
 * @param context - The context containing user and manager details
 * @returns Array of ChatMessage objects representing the greeting sequence
 */
export function generateManagerGreetings(context: GreetingContext): ChatMessage[] {
  const { userName, managerName, managerRole, companyName, repoUrl, taskDescription } = context;

  const baseTimestamp = new Date();

  // Generate ISO timestamp with offset in seconds for staggered messages
  const getTimestamp = (offsetSeconds: number): string => {
    const time = new Date(baseTimestamp.getTime() + offsetSeconds * 1000);
    return time.toISOString();
  };

  return [
    {
      role: "model",
      text: `Hey ${userName}! Welcome to ${companyName}! I'm so glad to have you on the team.`,
      timestamp: getTimestamp(0),
    },
    {
      role: "model",
      text: `I'm ${managerName}, your ${managerRole}. I'll be helping you get up to speed and supporting you throughout your work here.`,
      timestamp: getTimestamp(2),
    },
    {
      role: "model",
      text: `Here's what you'll be working on:\n\n"${taskDescription.slice(0, 200)}${taskDescription.length > 200 ? "..." : ""}"`,
      timestamp: getTimestamp(5),
    },
    {
      role: "model",
      text: `You can check out the repo here: ${repoUrl}`,
      timestamp: getTimestamp(8),
    },
    {
      role: "model",
      text: `Feel free to ask me any questions you have, or reach out to the team. When you're done, submit your PR and give me a call to discuss!`,
      timestamp: getTimestamp(12),
    },
  ];
}
