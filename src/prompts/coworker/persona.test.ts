import { describe, it, expect } from "vitest";
import {
  buildCoworkerBasePrompt,
  buildChatPrompt,
  buildVoicePrompt,
} from "./persona";
import type { CoworkerPersona } from "@/types";

const makeCoworker = (
  overrides: Partial<CoworkerPersona> = {}
): CoworkerPersona => ({
  name: "Alex",
  role: "Senior Engineer",
  personaStyle: "casual and technical",
  knowledge: [],
  ...overrides,
});

describe("buildCoworkerBasePrompt", () => {
  it("does NOT include taskDescription in the prompt", () => {
    const prompt = buildCoworkerBasePrompt(makeCoworker(), {
      companyName: "Acme",
      candidateName: "Bob",
      taskDescription: "Fix the logging latency issue in the API gateway",
    });

    expect(prompt).not.toContain("logging latency");
    expect(prompt).not.toContain("API gateway");
    expect(prompt).not.toContain("They're working on:");
    expect(prompt).not.toContain("Task context not provided");
  });

  it("includes the generic task awareness rule", () => {
    const prompt = buildCoworkerBasePrompt(makeCoworker(), {
      companyName: "Acme",
      candidateName: "Bob",
      taskDescription: "Fix the logging latency issue",
    });

    expect(prompt).toContain(
      "You do NOT know the details of their task unless they tell you"
    );
    expect(prompt).toContain("new team member working on a coding task");
  });

  it("still includes tech stack when provided", () => {
    const prompt = buildCoworkerBasePrompt(makeCoworker(), {
      companyName: "Acme",
      techStack: ["React", "Node.js"],
    });

    expect(prompt).toContain("Tech stack includes: React, Node.js");
  });

  it("omits tech stack line when not provided", () => {
    const prompt = buildCoworkerBasePrompt(makeCoworker(), {
      companyName: "Acme",
    });

    expect(prompt).not.toContain("Tech stack includes");
  });
});

describe("buildChatPrompt", () => {
  it("does NOT leak taskDescription into chat prompt", () => {
    const prompt = buildChatPrompt(
      makeCoworker(),
      {
        companyName: "Acme",
        candidateName: "Bob",
        taskDescription: "Implement real-time notifications",
      },
      "",
      ""
    );

    expect(prompt).not.toContain("real-time notifications");
    expect(prompt).not.toContain("They're working on:");
  });
});

describe("buildVoicePrompt", () => {
  it("does NOT leak taskDescription into voice prompt", () => {
    const prompt = buildVoicePrompt(
      makeCoworker(),
      {
        companyName: "Acme",
        candidateName: "Bob",
        taskDescription: "Implement real-time notifications",
      },
      "",
      ""
    );

    expect(prompt).not.toContain("real-time notifications");
    expect(prompt).not.toContain("They're working on:");
  });
});
