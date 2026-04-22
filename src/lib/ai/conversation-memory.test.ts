/**
 * Tests for Conversation Memory System
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  formatConversationTimeline,
  buildCrossCoworkerContext,
  type ChatMessage,
  type ConversationWithMeta,
  type CoworkerMemory,
} from "./conversation-memory";

// Mock the gemini module
vi.mock("./gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: "We discussed the authentication system and database setup.",
      }),
    },
  },
}));

describe("conversation-memory", () => {
  const createMessage = (
    role: "user" | "model",
    text: string
  ): ChatMessage => ({
    role,
    text,
    timestamp: new Date().toISOString(),
  });

  const createConversation = (
    type: "text" | "voice",
    coworkerId: string | null,
    messages: ChatMessage[]
  ): ConversationWithMeta => ({
    type,
    coworkerId,
    messages,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe("buildCoworkerMemory", () => {
    it("should return empty memory for no conversations", async () => {
      const memory = await buildCoworkerMemory([], "Alex Chen");

      expect(memory.hasPriorConversations).toBe(false);
      expect(memory.summary).toBeNull();
      expect(memory.recentMessages).toHaveLength(0);
      expect(memory.totalMessageCount).toBe(0);
    });

    it("should return recent messages for few messages", async () => {
      const messages = [
        createMessage("user", "Hello"),
        createMessage("model", "Hi there!"),
        createMessage("user", "How are you?"),
        createMessage("model", "I'm doing well, thanks!"),
      ];

      const conversations = [
        createConversation("text", "coworker-1", messages),
      ];
      const memory = await buildCoworkerMemory(conversations, "Alex Chen");

      expect(memory.hasPriorConversations).toBe(true);
      expect(memory.totalMessageCount).toBe(4);
      expect(memory.recentMessages).toHaveLength(4);
      // No summary for < 5 messages
      expect(memory.summary).toBeNull();
    });

    it("should generate summary for many messages", async () => {
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 15; i++) {
        messages.push(createMessage("user", `Question ${i}`));
        messages.push(createMessage("model", `Answer ${i}`));
      }

      const conversations = [
        createConversation("text", "coworker-1", messages),
      ];
      const memory = await buildCoworkerMemory(conversations, "Alex Chen");

      expect(memory.hasPriorConversations).toBe(true);
      expect(memory.totalMessageCount).toBe(30);
      expect(memory.recentMessages).toHaveLength(30); // MAX_RECENT_MESSAGES = Infinity
      // Summary is still generated for >5 messages even with full recent window
      expect(memory.summary).toBeTruthy();
    });

    it("should combine messages from multiple conversations", async () => {
      const textMessages = [
        createMessage("user", "Hi via chat"),
        createMessage("model", "Hello!"),
      ];
      const voiceMessages = [
        createMessage("user", "Hi via call"),
        createMessage("model", "Good to hear from you!"),
      ];

      const conversations = [
        createConversation("text", "coworker-1", textMessages),
        createConversation("voice", "coworker-1", voiceMessages),
      ];

      const memory = await buildCoworkerMemory(conversations, "Alex Chen");

      expect(memory.hasPriorConversations).toBe(true);
      expect(memory.totalMessageCount).toBe(4);
      expect(memory.recentMessages).toHaveLength(4);
    });

    it("should handle empty message arrays in conversations", async () => {
      const conversations = [
        createConversation("text", "coworker-1", []),
        createConversation("voice", "coworker-1", []),
      ];

      const memory = await buildCoworkerMemory(conversations, "Alex Chen");

      expect(memory.hasPriorConversations).toBe(false);
      expect(memory.totalMessageCount).toBe(0);
    });
  });

  describe("formatMemoryForPrompt", () => {
    it("should return empty string for no prior conversations", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: false,
        summary: null,
        recentMessages: [],
        totalMessageCount: 0,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");
      expect(result).toBe("");
    });

    it("should skip summary and only include recent messages", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: true,
        summary: "We discussed the authentication system.",
        recentMessages: [createMessage("user", "Can you help?")],
        totalMessageCount: 10,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");

      expect(result).toContain("## Conversation History");
      expect(result).not.toContain("Summary");
      expect(result).toContain("Candidate: Can you help?");
    });

    it("should format recent messages with correct labels", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: true,
        summary: null,
        recentMessages: [
          createMessage("user", "What's the API endpoint?"),
          createMessage("model", "Use /api/v1/tasks"),
        ],
        totalMessageCount: 2,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");

      expect(result).toContain("Candidate: What's the API endpoint?");
      expect(result).toContain("You: Use /api/v1/tasks");
    });

    it("should merge consecutive same-role messages", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: true,
        summary: null,
        recentMessages: [
          createMessage("model", "Hey, no"),
          createMessage("model", "problem."),
          createMessage("model", "What's up?"),
          createMessage("user", "Not much"),
        ],
        totalMessageCount: 4,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");

      expect(result).toContain("You: Hey, no problem. What's up?");
      expect(result).toContain("Candidate: Not much");
      // Should not have separate entries for fragments
      expect(result).not.toContain("You: problem.");
      expect(result).not.toContain("You: What's up?");
    });
  });

  describe("formatConversationTimeline", () => {
    it("should return empty string for no conversations", () => {
      expect(formatConversationTimeline([])).toBe("");
    });

    it("should group messages by conversation with modality headers", () => {
      const conversations: ConversationWithMeta[] = [
        createConversation("text", "c1", [
          createMessage("user", "Hi!"),
          createMessage("model", "Hey, welcome!"),
        ]),
        createConversation("voice", "c1", [
          createMessage("model", "What's going on?"),
          createMessage("user", "Quick question about the table"),
        ]),
      ];
      // Set different times
      conversations[0].createdAt = new Date("2026-04-01T14:15:00Z");
      conversations[1].createdAt = new Date("2026-04-01T15:03:00Z");

      const result = formatConversationTimeline(conversations);

      expect(result).toContain("## Past Conversations");
      expect(result).toContain("### Slack chat");
      expect(result).toContain("### Voice call");
      expect(result).toContain("Candidate: Hi!");
      expect(result).toContain("You: Hey, welcome!");
      expect(result).toContain("You: What's going on?");
      // Chat should come before voice (chronological)
      const chatIdx = result.indexOf("Slack chat");
      const voiceIdx = result.indexOf("Voice call");
      expect(chatIdx).toBeLessThan(voiceIdx);
    });

    it("should merge voice fragments within conversations", () => {
      const conversations: ConversationWithMeta[] = [
        createConversation("voice", "c1", [
          createMessage("model", "Hey,"),
          createMessage("model", "what's up?"),
          createMessage("user", "Not much"),
        ]),
      ];

      const result = formatConversationTimeline(conversations);

      expect(result).toContain("You: Hey, what's up?");
      expect(result).not.toContain("You: what's up?");
    });

    it("should skip conversations with no messages", () => {
      const conversations: ConversationWithMeta[] = [
        createConversation("text", "c1", []),
        createConversation("voice", "c1", [
          createMessage("model", "Hey!"),
        ]),
      ];

      const result = formatConversationTimeline(conversations);

      expect(result).not.toContain("Slack chat");
      expect(result).toContain("Voice call");
    });
  });

  describe("buildCrossCoworkerContext", () => {
    it("should return empty string when no other coworker conversations", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", currentCoworkerId, [
          createMessage("user", "Hi"),
        ]),
      ];
      const coworkerMap = new Map([["coworker-1", "Alex Chen"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toBe("");
    });

    it("should include context about other coworker conversations", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", currentCoworkerId, [
          createMessage("user", "Hi Alex"),
        ]),
        createConversation("text", "coworker-2", [
          createMessage("user", "How do I run tests?"),
          createMessage("model", "Use npm test"),
        ]),
      ];
      const coworkerMap = new Map([
        ["coworker-1", "Alex Chen"],
        ["coworker-2", "Jordan Rivera"],
      ]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toContain("Jordan Rivera");
      expect(result).toContain("Don't assume you know what they discussed");
      // Should NOT contain topic hints or message previews
      expect(result).not.toContain("How do I run tests?");
      expect(result).not.toContain("Last topic hint");
    });

    it("should exclude HR interview conversations (null coworkerId)", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", currentCoworkerId, [
          createMessage("user", "Hi"),
        ]),
        createConversation("voice", null, [
          createMessage("user", "HR interview message"),
        ]),
      ];
      const coworkerMap = new Map([["coworker-1", "Alex Chen"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toBe("");
      expect(result).not.toContain("HR interview");
    });

    it("should not include topic hints or message content", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", "coworker-2", [
          createMessage("user", "Secret implementation details"),
        ]),
      ];
      const coworkerMap = new Map([["coworker-2", "Jordan Rivera"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toContain("Jordan Rivera");
      expect(result).not.toContain("Secret implementation details");
      expect(result).not.toContain("Last topic hint");
    });

    it("should handle conversations with empty messages", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [createConversation("text", "coworker-2", [])];
      const coworkerMap = new Map([["coworker-2", "Jordan Rivera"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toBe("");
    });

    it("should not pry into other conversations", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", "coworker-2", [
          createMessage("user", "Secret question"),
        ]),
      ];
      const coworkerMap = new Map([["coworker-2", "Jordan Rivera"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toContain("Don't assume you know what they discussed");
    });

    it("should include rule about not assuming conversation topics", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", "coworker-2", [
          createMessage("user", "Hello"),
        ]),
      ];
      const coworkerMap = new Map([["coworker-2", "Jordan Rivera"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      expect(result).toContain(
        "Don't assume you know what they discussed"
      );
    });
  });
});
