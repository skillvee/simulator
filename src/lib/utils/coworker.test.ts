import { describe, it, expect } from "vitest";
import { isManager } from "./coworker";

describe("isManager", () => {
  it("returns true for roles containing 'manager'", () => {
    expect(isManager("Engineering Manager")).toBe(true);
    expect(isManager("manager")).toBe(true);
    expect(isManager("Project Manager")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isManager("MANAGER")).toBe(true);
    expect(isManager("Manager")).toBe(true);
    expect(isManager("engineering MANAGER")).toBe(true);
  });

  it("returns false for non-manager roles", () => {
    expect(isManager("Senior Engineer")).toBe(false);
    expect(isManager("Designer")).toBe(false);
    expect(isManager("QA Lead")).toBe(false);
  });
});
