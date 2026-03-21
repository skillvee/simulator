import { describe, it, expect } from "vitest";
import { calculateTiming, countUniqueCoworkers } from "./report-data";

describe("calculateTiming", () => {
  it("should calculate duration in minutes", () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const completedAt = new Date("2024-01-01T11:30:00Z");

    const result = calculateTiming(startedAt, completedAt);
    expect(result.totalDurationMinutes).toBe(90);
    expect(result.workingPhaseMinutes).toBe(90);
  });

  it("should use current time when completedAt is null", () => {
    const startedAt = new Date(Date.now() - 60000); // 1 minute ago

    const result = calculateTiming(startedAt, null);
    expect(result.totalDurationMinutes).toBeGreaterThanOrEqual(0);
    expect(result.totalDurationMinutes).toBeLessThanOrEqual(2);
  });

  it("should floor minutes", () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const completedAt = new Date("2024-01-01T10:01:30Z"); // 1.5 minutes

    const result = calculateTiming(startedAt, completedAt);
    expect(result.totalDurationMinutes).toBe(1);
  });
});

describe("countUniqueCoworkers", () => {
  it("should count unique non-null coworker IDs", () => {
    const conversations = [
      { coworkerId: "cw-1" },
      { coworkerId: "cw-2" },
      { coworkerId: "cw-1" }, // duplicate
      { coworkerId: null },
    ];

    expect(countUniqueCoworkers(conversations)).toBe(2);
  });

  it("should return 0 for empty array", () => {
    expect(countUniqueCoworkers([])).toBe(0);
  });

  it("should return 0 for all null coworker IDs", () => {
    const conversations = [{ coworkerId: null }, { coworkerId: null }];
    expect(countUniqueCoworkers(conversations)).toBe(0);
  });
});
