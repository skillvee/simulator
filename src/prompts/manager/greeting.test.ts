import { describe, it, expect } from "vitest";
import { buildGreetingPrompt, GreetingPromptContext } from "./greeting";

const baseContext: GreetingPromptContext = {
  userName: "Alice",
  managerName: "Bob",
  managerRole: "Engineering Manager",
  companyName: "Acme",
  repoUrl: "https://github.com/acme/repo",
  taskDescription: "Fix the login bug",
  personaStyle: "friendly and supportive",
};

describe("buildGreetingPrompt", () => {
  it("includes grounding guardrails in the prompt", () => {
    const prompt = buildGreetingPrompt(baseContext);

    expect(prompt).toContain("GROUNDING GUARDRAILS");
    expect(prompt).toContain(
      "do NOT assume the candidate has read or understood any specific detail you mentioned"
    );
    expect(prompt).toContain(
      "do NOT assume they absorbed every detail"
    );
    expect(prompt).toContain(
      'Have you had a chance to look at X?'
    );
    expect(prompt).toContain(
      "ONLY reference specific task details (features, components, bugs) if the candidate explicitly mentioned them"
    );
  });

  it("includes grounding guardrails for post-voice kickoff", () => {
    const prompt = buildGreetingPrompt({
      ...baseContext,
      postVoiceKickoff: true,
    });

    expect(prompt).toContain("GROUNDING GUARDRAILS");
    expect(prompt).toContain(
      "do NOT assume the candidate has read or understood any specific detail you mentioned"
    );
  });

  it("includes zero-context rule for non-post-voice prompts", () => {
    const prompt = buildGreetingPrompt(baseContext);

    expect(prompt).toContain(
      "The candidate has ZERO prior context"
    );
    expect(prompt).toContain(
      "Even after your greeting, the candidate may not have absorbed all details"
    );
  });

  it("returns valid prompt string with all sections", () => {
    const prompt = buildGreetingPrompt(baseContext);

    expect(prompt).toContain("You are Bob");
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("CONVERSATION RESPONSES");
    expect(prompt).toContain("VAGUE QUESTION HANDLING");
  });

  it("includes teammates section when provided", () => {
    const prompt = buildGreetingPrompt({
      ...baseContext,
      teammates: [{ name: "Carol", role: "Designer" }],
    });

    expect(prompt).toContain("Carol (Designer)");
  });
});
