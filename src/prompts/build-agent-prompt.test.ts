import { describe, expect, it } from "vitest";
import { buildAgentPrompt, type AgentPromptContext } from "./build-agent-prompt";
import { LANGUAGES } from "@/lib/core/language";
import type { CoworkerPersona } from "@/types";

describe("buildAgentPrompt with language support", () => {
  const baseContext: AgentPromptContext = {
    companyName: "TestCo",
    techStack: ["TypeScript", "React"],
    agent: {
      name: "Alice Manager",
      role: "Engineering Manager",
      personaStyle: "Friendly and supportive",
      personality: null,
      knowledge: [],
      avatarUrl: "https://example.com/alice.jpg"
    } as CoworkerPersona,
    taskDescription: "Build a feature",
    candidateName: "Bob",
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    language: "en"
  };

  describe("language instruction placement", () => {
    it("should prepend Spanish instruction when language is 'es'", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es"
      };

      const prompt = buildAgentPrompt(context);

      // Spanish instruction should be at the very beginning
      expect(prompt).toContain(LANGUAGES.es.instruction);

      // Verify it's near the top (before the identity section)
      const spanishInstructionIndex = prompt.indexOf(LANGUAGES.es.instruction);
      const identityIndex = prompt.indexOf("You are Alice Manager");

      expect(spanishInstructionIndex).toBeGreaterThanOrEqual(0);
      expect(identityIndex).toBeGreaterThan(spanishInstructionIndex);
    });

    it("should NOT include Spanish instruction when language is 'en'", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "en"
      };

      const prompt = buildAgentPrompt(context);

      // English has empty instruction, so Spanish instruction should not appear
      expect(prompt).not.toContain(LANGUAGES.es.instruction);
      expect(prompt).not.toContain("Latin American Spanish");
      expect(prompt).not.toContain("tú form");
    });

    it("should still include all standard prompt sections with Spanish language", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        conversationHistory: "Previous conversation here",
        crossAgentContext: "Cross agent context here"
      };

      const prompt = buildAgentPrompt(context);

      // All standard sections should still be present
      expect(prompt).toContain("You are Alice Manager");
      expect(prompt).toContain("TestCo");
      expect(prompt).toContain("TypeScript, React");
      expect(prompt).toContain("Previous conversation here");
      expect(prompt).toContain("Cross agent context here");
      expect(prompt).toContain("Chat Rules"); // From CHAT_RULES
    });

    it("should handle voice media with Spanish language", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        media: "voice"
      };

      const prompt = buildAgentPrompt(context);

      // Should have Spanish instruction
      expect(prompt).toContain(LANGUAGES.es.instruction);

      // Should have voice rules instead of chat rules
      expect(prompt).toContain("Voice Rules");
      expect(prompt).not.toContain("Chat Rules");
      expect(prompt).toContain("Sound like a real phone call");
    });
  });

  describe("language instruction content", () => {
    it("should include correct Spanish instruction content", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es"
      };

      const prompt = buildAgentPrompt(context);

      // Verify key parts of the Spanish instruction are present
      expect(prompt).toContain("natural Latin American Spanish");
      expect(prompt).toContain("Technical terms");
      expect(prompt).toContain("APIs");
      expect(prompt).toContain("code stay in English");
      expect(prompt).toContain('"tú" form');
    });

    it("should handle initial_greeting phase with language", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        phase: "initial_greeting"
      };

      const prompt = buildAgentPrompt(context);

      // Should have both Spanish instruction and greeting hint
      expect(prompt).toContain(LANGUAGES.es.instruction);
      expect(prompt).toContain("FIRST Slack message to a new team member");
    });

    it("should handle defense phase with language", () => {
      const defenseContext = "Defense review details here";
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        phase: "defense",
        phaseContext: defenseContext
      };

      const prompt = buildAgentPrompt(context);

      // Should have both Spanish instruction and defense context
      expect(prompt).toContain(LANGUAGES.es.instruction);
      expect(prompt).toContain(defenseContext);
    });
  });

  describe("section ordering", () => {
    it("should maintain correct section order with language instruction", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        conversationHistory: "CONVERSATION_HISTORY_MARKER",
        crossAgentContext: "CROSS_AGENT_MARKER",
        phase: "ongoing"
      };

      const prompt = buildAgentPrompt(context);

      // Get positions of each section
      const positions = {
        language: prompt.indexOf(LANGUAGES.es.instruction),
        identity: prompt.indexOf("You are Alice Manager"),
        conversation: prompt.indexOf("CONVERSATION_HISTORY_MARKER"),
        crossAgent: prompt.indexOf("CROSS_AGENT_MARKER"),
        rules: prompt.indexOf("Chat Rules")
      };

      // Verify ordering: language -> identity -> conversation -> crossAgent -> rules
      expect(positions.language).toBeGreaterThanOrEqual(0);
      expect(positions.identity).toBeGreaterThan(positions.language);
      expect(positions.conversation).toBeGreaterThan(positions.identity);
      expect(positions.crossAgent).toBeGreaterThan(positions.conversation);
      expect(positions.rules).toBeGreaterThan(positions.crossAgent);
    });

    it("should maintain section order without language instruction for English", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "en",
        conversationHistory: "CONVERSATION_HISTORY_MARKER",
        crossAgentContext: "CROSS_AGENT_MARKER",
        phase: "ongoing"
      };

      const prompt = buildAgentPrompt(context);

      // Get positions of each section
      const positions = {
        identity: prompt.indexOf("You are Alice Manager"),
        conversation: prompt.indexOf("CONVERSATION_HISTORY_MARKER"),
        crossAgent: prompt.indexOf("CROSS_AGENT_MARKER"),
        rules: prompt.indexOf("Chat Rules")
      };

      // Verify ordering: identity -> conversation -> crossAgent -> rules
      expect(positions.identity).toBeGreaterThanOrEqual(0);
      expect(positions.conversation).toBeGreaterThan(positions.identity);
      expect(positions.crossAgent).toBeGreaterThan(positions.conversation);
      expect(positions.rules).toBeGreaterThan(positions.crossAgent);

      // Identity should be at or near the beginning (no language instruction before it)
      expect(positions.identity).toBeLessThan(100);
    });
  });

  describe("voice rules with language support", () => {
    it("should include Spanish fillers for voice prompt with language 'es'", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "es",
        media: "voice"
      };

      const prompt = buildAgentPrompt(context);

      // Should have Spanish voice rules and fillers
      expect(prompt).toContain("Voice Rules");
      expect(prompt).toContain("eh");
      expect(prompt).toContain("bueno");
      expect(prompt).toContain("este");
      expect(prompt).toContain("pues");
      expect(prompt).toContain("mira");
      expect(prompt).toContain("o sea");

      // Should include Spanish-specific voice rules
      expect(prompt).toContain("Habla naturalmente");
      expect(prompt).toContain("muletillas");
      expect(prompt).toContain("'tú', nunca 'usted'");
    });

    it("should include English fillers for voice prompt with language 'en'", () => {
      const context: AgentPromptContext = {
        ...baseContext,
        language: "en",
        media: "voice"
      };

      const prompt = buildAgentPrompt(context);

      // Should have English voice rules and fillers
      expect(prompt).toContain("Voice Rules");
      expect(prompt).toContain("um");
      expect(prompt).toContain("uh");
      expect(prompt).toContain("let me think");

      // Should include English voice rules
      expect(prompt).toContain("Speak naturally and conversationally");
      expect(prompt).toContain("Use natural fillers");
    });
  });

  describe("no language ternaries", () => {
    it("should use LANGUAGES config instead of hardcoded ternaries", () => {
      // Test that both languages work through the config
      const enContext: AgentPromptContext = { ...baseContext, language: "en" };
      const esContext: AgentPromptContext = { ...baseContext, language: "es" };

      const enPrompt = buildAgentPrompt(enContext);
      const esPrompt = buildAgentPrompt(esContext);

      // English has empty instruction, so it won't appear at the start
      // The prompt should start with the identity section instead
      expect(enPrompt.startsWith("You are")).toBe(true);

      // Spanish should have instruction at the beginning
      const esInstruction = LANGUAGES.es.instruction;
      expect(esPrompt.startsWith(esInstruction)).toBe(true);
    });
  });
});