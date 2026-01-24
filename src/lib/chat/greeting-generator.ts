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
  const formatTime = (offset: number): string => {
    const time = new Date(baseTimestamp.getTime() + offset * 60000);
    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return [
    {
      role: "model",
      text: `Hey ${userName}! Welcome to ${companyName}! I'm so glad to have you on the team.`,
      timestamp: formatTime(0),
    },
    {
      role: "model",
      text: `I'm ${managerName}, your ${managerRole}. I'll be helping you get up to speed and supporting you throughout your work here.`,
      timestamp: formatTime(0),
    },
    {
      role: "model",
      text: `Let's schedule a quick kickoff call to go over your first task and answer any questions you might have. Sound good?`,
      timestamp: formatTime(1),
    },
    {
      role: "model",
      text: `In the meantime, you can check out the repo here: ${repoUrl}`,
      timestamp: formatTime(1),
    },
    {
      role: "model",
      text: `Here's a quick preview of what you'll be working on:\n\n"${taskDescription.slice(0, 200)}${taskDescription.length > 200 ? "..." : ""}"`,
      timestamp: formatTime(2),
    },
    {
      role: "model",
      text: `When you're ready, hop on the kickoff call and we'll dive into the details together!`,
      timestamp: formatTime(2),
    },
  ];
}
