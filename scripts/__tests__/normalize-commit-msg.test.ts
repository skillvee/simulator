import { describe, it, expect } from "vitest";
import { normalizeCommitMessage } from "../normalize-commit-msg.mjs";

describe("normalizeCommitMessage", () => {
  it("lowercases the type prefix", () => {
    expect(normalizeCommitMessage("FEAT: add button")).toBe("feat: add button");
    expect(normalizeCommitMessage("FIX: resolve crash")).toBe("fix: resolve crash");
  });

  it("ensures space after colon", () => {
    expect(normalizeCommitMessage("feat:add button")).toBe("feat: add button");
    expect(normalizeCommitMessage("fix:resolve crash")).toBe("fix: resolve crash");
  });

  it("lowercases first character of subject", () => {
    expect(normalizeCommitMessage("feat: Add button")).toBe("feat: add button");
  });

  it("removes trailing period from subject", () => {
    expect(normalizeCommitMessage("feat: add button.")).toBe("feat: add button");
  });

  it("trims whitespace from subject", () => {
    expect(normalizeCommitMessage("feat:  add button  ")).toBe("feat: add button");
  });

  it("handles scope in parentheses", () => {
    expect(normalizeCommitMessage("FEAT(ui): Add button.")).toBe("feat(ui): add button");
  });

  it("handles breaking change bang", () => {
    expect(normalizeCommitMessage("FEAT!: Remove old API.")).toBe("feat!: remove old API");
  });

  it("handles scope + breaking change bang", () => {
    expect(normalizeCommitMessage("FEAT(api)!: Remove endpoint.")).toBe("feat(api)!: remove endpoint");
  });

  it("skips merge commits", () => {
    const msg = "Merge branch 'main' into feature";
    expect(normalizeCommitMessage(msg)).toBe(msg);
  });

  it("skips revert commits", () => {
    const msg = 'Revert "feat: add button"';
    expect(normalizeCommitMessage(msg)).toBe(msg);
  });

  it("skips fixup commits", () => {
    const msg = "fixup! feat: add button";
    expect(normalizeCommitMessage(msg)).toBe(msg);
  });

  it("skips squash commits", () => {
    const msg = "squash! feat: add button";
    expect(normalizeCommitMessage(msg)).toBe(msg);
  });

  it("preserves body and footer", () => {
    const msg = "FEAT: Add button.\n\nThis adds a button.\n\nBreaking-Change: yes";
    expect(normalizeCommitMessage(msg)).toBe(
      "feat: add button\n\nThis adds a button.\n\nBreaking-Change: yes"
    );
  });

  it("returns non-conventional messages unchanged", () => {
    const msg = "random message without type";
    expect(normalizeCommitMessage(msg)).toBe(msg);
  });
});
