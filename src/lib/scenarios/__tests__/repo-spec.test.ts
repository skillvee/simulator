/**
 * Tests for RepoSpec types and Zod validation
 */

import { describe, it, expect } from "vitest";
import {
  repoSpecSchema,
  fileSpecSchema,
  commitSpecSchema,
  issueSpecSchema,
  authorSpecSchema,
} from "../repo-spec";

const validAuthor = {
  name: "Sarah Kim",
  email: "sarah.kim@meta.com",
  role: "Engineering Manager",
};

const validCommit = {
  message: "feat: initial project setup",
  authorName: "Sarah Kim",
  authorEmail: "sarah.kim@meta.com",
  daysAgo: 21,
};

const validFile = {
  path: "src/lib/webhook-processor.ts",
  content: "// TODO: implement retry logic",
  purpose: "stub" as const,
  addedInCommit: 0,
};

const validIssue = {
  title: "Webhook events being dropped (~5% drop rate)",
  body: "Several merchants reported missing events...",
  labels: ["bug", "priority:high"],
  state: "open" as const,
  isMainTask: true,
  comments: [
    {
      authorName: "Sarah Kim",
      body: "I looked into the processor at src/services/webhook-processor.ts",
    },
  ],
};

const validSpec = {
  projectName: "payment-gateway",
  projectDescription: "Internal payment processing service",
  scaffoldId: "express-ts" as const,
  readmeContent:
    "# Payment Gateway\n\nInternal service for processing payments and delivering webhooks to merchants.\n\n## Setup\n\nnpm install && npm run dev",
  files: [validFile, { ...validFile, path: "src/types/index.ts" }, { ...validFile, path: "docs/architecture.md", purpose: "doc" as const }],
  commitHistory: [
    validCommit,
    { ...validCommit, message: "feat: add webhook handler", daysAgo: 14 },
    { ...validCommit, message: "wip: start retry logic", daysAgo: 7 },
  ],
  issues: [
    validIssue,
    { ...validIssue, title: "Add merchant onboarding API", state: "closed" as const, isMainTask: false, comments: [] },
  ],
  authors: [validAuthor, { ...validAuthor, name: "Bob Martinez", email: "bob@meta.com", role: "Senior Engineer" }],
};

describe("authorSpecSchema", () => {
  it("should validate a valid author", () => {
    expect(authorSpecSchema.safeParse(validAuthor).success).toBe(true);
  });

  it("should reject empty name", () => {
    expect(authorSpecSchema.safeParse({ ...validAuthor, name: "" }).success).toBe(false);
  });

  it("should reject invalid email", () => {
    expect(authorSpecSchema.safeParse({ ...validAuthor, email: "not-email" }).success).toBe(false);
  });
});

describe("fileSpecSchema", () => {
  it("should validate a valid file", () => {
    expect(fileSpecSchema.safeParse(validFile).success).toBe(true);
  });

  it("should accept empty content", () => {
    expect(fileSpecSchema.safeParse({ ...validFile, content: "" }).success).toBe(true);
  });

  it("should reject invalid purpose", () => {
    expect(
      fileSpecSchema.safeParse({ ...validFile, purpose: "invalid" }).success
    ).toBe(false);
  });

  it("should accept all valid purposes", () => {
    for (const purpose of ["stub", "working", "test", "doc", "config"]) {
      expect(
        fileSpecSchema.safeParse({ ...validFile, purpose }).success
      ).toBe(true);
    }
  });

  it("should reject negative addedInCommit", () => {
    expect(
      fileSpecSchema.safeParse({ ...validFile, addedInCommit: -1 }).success
    ).toBe(false);
  });
});

describe("commitSpecSchema", () => {
  it("should validate a valid commit", () => {
    expect(commitSpecSchema.safeParse(validCommit).success).toBe(true);
  });

  it("should reject non-integer daysAgo", () => {
    expect(
      commitSpecSchema.safeParse({ ...validCommit, daysAgo: 1.5 }).success
    ).toBe(false);
  });
});

describe("issueSpecSchema", () => {
  it("should validate a valid issue", () => {
    expect(issueSpecSchema.safeParse(validIssue).success).toBe(true);
  });

  it("should reject body shorter than 10 characters", () => {
    expect(
      issueSpecSchema.safeParse({ ...validIssue, body: "short" }).success
    ).toBe(false);
  });

  it("should default labels to empty array", () => {
    const issue = { ...validIssue };
    delete (issue as Record<string, unknown>).labels;
    const result = issueSpecSchema.safeParse(issue);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels).toEqual([]);
    }
  });
});

describe("repoSpecSchema", () => {
  it("should validate a complete valid spec", () => {
    const result = repoSpecSchema.safeParse(validSpec);
    expect(result.success).toBe(true);
  });

  it("should reject invalid scaffoldId", () => {
    expect(
      repoSpecSchema.safeParse({ ...validSpec, scaffoldId: "python-fastapi" }).success
    ).toBe(false);
  });

  it("should reject too few files", () => {
    expect(
      repoSpecSchema.safeParse({ ...validSpec, files: [validFile, { ...validFile, path: "b.ts" }] }).success
    ).toBe(false);
  });

  it("should reject too few commits", () => {
    expect(
      repoSpecSchema.safeParse({
        ...validSpec,
        commitHistory: [validCommit, { ...validCommit, daysAgo: 14 }],
      }).success
    ).toBe(false);
  });

  it("should reject too few issues", () => {
    expect(
      repoSpecSchema.safeParse({ ...validSpec, issues: [validIssue] }).success
    ).toBe(false);
  });

  it("should reject too few authors", () => {
    expect(
      repoSpecSchema.safeParse({ ...validSpec, authors: [validAuthor] }).success
    ).toBe(false);
  });

  it("should reject short readmeContent", () => {
    expect(
      repoSpecSchema.safeParse({ ...validSpec, readmeContent: "Too short" }).success
    ).toBe(false);
  });
});
