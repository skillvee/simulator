/**
 * Tests for Conversation Memory System
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
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

      const conversations = [createConversation("text", "coworker-1", messages)];
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

      const conversations = [createConversation("text", "coworker-1", messages)];
      const memory = await buildCoworkerMemory(conversations, "Alex Chen");

      expect(memory.hasPriorConversations).toBe(true);
      expect(memory.totalMessageCount).toBe(30);
      expect(memory.recentMessages).toHaveLength(10); // MAX_RECENT_MESSAGES
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

    it("should include summary section when available", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: true,
        summary: "We discussed the authentication system.",
        recentMessages: [createMessage("user", "Can you help?")],
        totalMessageCount: 10,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");

      expect(result).toContain("## Prior Conversation History");
      expect(result).toContain("### Summary of Earlier Conversations");
      expect(result).toContain("We discussed the authentication system.");
      expect(result).toContain("### Recent Messages");
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

    it("should include guidance about referencing prior discussions", () => {
      const memory: CoworkerMemory = {
        hasPriorConversations: true,
        summary: null,
        recentMessages: [createMessage("user", "Hi")],
        totalMessageCount: 1,
      };

      const result = formatMemoryForPrompt(memory, "Alex Chen");

      expect(result).toContain("Continue the conversation naturally");
      expect(result).toContain("Don't repeat information you've already shared");
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

      expect(result).toContain("## Context About Other Conversations");
      expect(result).toContain("Jordan Rivera");
      expect(result).toContain("2 messages");
      expect(result).toContain("How do I run tests?");
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

    it("should truncate long message previews", () => {
      const currentCoworkerId = "coworker-1";
      const longMessage = "A".repeat(200);
      const conversations = [
        createConversation("text", "coworker-2", [
          createMessage("user", longMessage),
        ]),
      ];
      const coworkerMap = new Map([["coworker-2", "Jordan Rivera"]]);

      const result = buildCrossCoworkerContext(
        conversations,
        currentCoworkerId,
        coworkerMap
      );

      // The preview should be truncated (100 chars + "...")
      expect(result).toContain("...");
      // Should NOT contain the full 200-char message
      expect(result).not.toContain(longMessage);
    });

    it("should handle conversations with empty messages", () => {
      const currentCoworkerId = "coworker-1";
      const conversations = [
        createConversation("text", "coworker-2", []),
      ];
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

      expect(result).toContain("don't pry into their conversations");
    });
  });
});
