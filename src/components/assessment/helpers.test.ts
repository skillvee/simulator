import { describe, it, expect } from "vitest";
import { getScoreColor } from "./helpers";

describe("getScoreColor", () => {
  it("returns green for scores >= 3.5 (exceptional)", () => {
    const colors = getScoreColor(3.5);
    expect(colors.fill).toBe("text-green-600");
    expect(colors.bg).toBe("bg-green-100");

    // Also test 4.0
    expect(getScoreColor(4.0).fill).toBe("text-green-600");
  });

  it("returns blue for scores 2.5-3.4 (strong)", () => {
    const colors = getScoreColor(3.0);
    expect(colors.fill).toBe("text-blue-600");
    expect(colors.bg).toBe("bg-blue-100");

    // Boundary: exactly 2.5
    expect(getScoreColor(2.5).fill).toBe("text-blue-600");
    // Just below 3.5
    expect(getScoreColor(3.4).fill).toBe("text-blue-600");
  });

  it("returns amber for scores 1.5-2.4 (needs improvement)", () => {
    const colors = getScoreColor(2.0);
    expect(colors.fill).toBe("text-amber-600");
    expect(colors.bg).toBe("bg-amber-100");

    // Boundary: exactly 1.5
    expect(getScoreColor(1.5).fill).toBe("text-amber-600");
    // Just below 2.5
    expect(getScoreColor(2.4).fill).toBe("text-amber-600");
  });

  it("returns red for scores < 1.5 (critical)", () => {
    const colors = getScoreColor(1.0);
    expect(colors.fill).toBe("text-red-600");
    expect(colors.bg).toBe("bg-red-100");

    // Edge: exactly 1.4
    expect(getScoreColor(1.4).fill).toBe("text-red-600");
    // Edge: 0
    expect(getScoreColor(0).fill).toBe("text-red-600");
  });
});
