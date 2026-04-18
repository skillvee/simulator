/**
 * Tests for eval judge language calibration
 */

import { describe, it, expect } from "vitest";
import { buildJudgePrompt } from "./judge";

describe("buildJudgePrompt", () => {
  const baseContext = {
    coworkerName: "Alex",
    coworkerRole: "Senior Engineer",
    coworkerPersonality: "Direct and technical",
    companyName: "TechCo",
    media: "chat" as const,
    conversationHistory: "",
    userMessage: "Hey, how's the project going?",
    response: "Going well, making progress on the API.",
    criteria: "Evaluate the response quality",
    isMultiTurn: false,
  };

  describe("language calibration", () => {
    it("should include Spanish calibration notes when language is 'es'", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        language: "es",
      });

      // Check for Spanish calibration content
      expect(prompt).toContain("Spanish Language Calibration");
      expect(prompt).toContain("Don't penalize Spanish conversational fillers (eh, bueno, a ver, pues, vale, vaya)");
      expect(prompt).toContain("Don't flag English technical terms as code-switching errors");
      expect(prompt).toContain("Judge naturalness against Spanish native speaker register");
    });

    it("should NOT include Spanish calibration notes when language is 'en'", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        language: "en",
      });

      // Should NOT contain Spanish calibration content
      expect(prompt).not.toContain("Spanish Language Calibration");
      expect(prompt).not.toContain("conversational fillers (eh, bueno, a ver");
      expect(prompt).not.toContain("code-switching errors");
      expect(prompt).not.toContain("Spanish native speaker register");
    });

    it("should NOT include Spanish calibration notes when language is undefined", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        // No language specified
      });

      // Should NOT contain Spanish calibration content
      expect(prompt).not.toContain("Spanish Language Calibration");
      expect(prompt).not.toContain("conversational fillers (eh, bueno, a ver");
      expect(prompt).not.toContain("code-switching errors");
      expect(prompt).not.toContain("Spanish native speaker register");
    });

    it("should handle Spanish language with voice media", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        media: "voice",
        language: "es",
      });

      // Should still include calibration for voice
      expect(prompt).toContain("Spanish Language Calibration");
      expect(prompt).toContain("phone call"); // Should reference voice media
    });

    it("should handle Spanish language with multi-turn conversations", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        language: "es",
        isMultiTurn: true,
        media: "voice",
      });

      // Should include both multi-turn context and Spanish calibration
      expect(prompt).toContain("Spanish Language Calibration");
      expect(prompt).toContain("COWORKER's behavior"); // Multi-turn specific text
    });
  });

  describe("prompt structure integrity", () => {
    it("should maintain all original rubric sections with Spanish language", () => {
      const prompt = buildJudgePrompt({
        ...baseContext,
        language: "es",
      });

      // Verify all standard sections are present
      expect(prompt).toContain("## Scoring Rubric (1-5)");
      expect(prompt).toContain("**Naturalness**");
      expect(prompt).toContain("**Persona consistency**");
      expect(prompt).toContain("**Brevity**");
      expect(prompt).toContain("**Conversational flow**");
      expect(prompt).toContain("**Information discipline**");
      expect(prompt).toContain("**AI-isms**");
      expect(prompt).toContain("## Calibration Examples");
      expect(prompt).toContain("## Scenario Context");
      expect(prompt).toContain("## Evaluation Criteria");
      expect(prompt).toContain("## Conversation");
      expect(prompt).toContain("## Your Evaluation");
    });

    it("should include JSON format instructions regardless of language", () => {
      const promptEn = buildJudgePrompt({
        ...baseContext,
        language: "en",
      });

      const promptEs = buildJudgePrompt({
        ...baseContext,
        language: "es",
      });

      const jsonFormat = 'Respond as JSON only (no markdown fences):';
      expect(promptEn).toContain(jsonFormat);
      expect(promptEs).toContain(jsonFormat);

      const expectedFields = '{"flaws": "...", "naturalness": N, "personaConsistency": N';
      expect(promptEn).toContain(expectedFields);
      expect(promptEs).toContain(expectedFields);
    });
  });
});